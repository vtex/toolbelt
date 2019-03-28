import { Builder, Change } from '@vtex/api'
import * as retry from 'async-retry'
import axios from 'axios'
import chalk from 'chalk'
import { execSync } from 'child-process-es6-promise'
import * as chokidar from 'chokidar'
import * as debounce from 'debounce'
import { readFileSync } from 'fs'
import { outputJson, pathExists, readJson } from 'fs-extra'
import * as moment from 'moment'
import { join, resolve as resolvePath, sep} from 'path'
import { concat, equals, filter, has, isEmpty, isNil, map, mapObjIndexed, merge, path as ramdaPath, pipe, prop, reject as ramdaReject, test, toPairs, values } from 'ramda'
import { createInterface } from 'readline'
import { createClients } from '../../clients'
import { getAccount, getEnvironment, getToken, getWorkspace } from '../../conf'
import { publicEndpoint, region } from '../../env'
import { CommandError } from '../../errors'
import { getMostAvailableHost } from '../../host'
import { toAppLocator } from '../../locator'
import log from '../../logger'
import { getAppRoot, getManifest } from '../../manifest'
import { listenBuild } from '../build'
import { formatNano } from '../utils'
import startDebuggerTunnel from './debugger'
import { createLinkConfig, getIgnoredPaths, getLinkedDepsDirs, getLinkedFiles, listLocalFiles } from './file'
import legacyLink from './legacyLink'
import { checkBuilderHubMessage, isLinked, pathToFileObject, resolveAppId, showBuilderHubMessage, validateAppAction } from './utils'

const root = getAppRoot()
const DELETE_SIGN = chalk.red('D')
const UPDATE_SIGN = chalk.blue('U')
const stabilityThreshold = process.platform === 'darwin' ? 100 : 200
const AVAILABILITY_TIMEOUT = 1000
const N_HOSTS = 3
const builderHubTypingsInfoTimeout = 2000  // 2 seconds
const typingsPath = 'public/_types'
const yarnPath = require.resolve('yarn/bin/yarn')
const typingsURLRegex = /_v\/\w*\/typings/
const RETRY_OPTS_INITIAL_LINK = {
  retries: 2,
  minTimeout: 1000,
  factor: 2,
}
const RETRY_OPTS_DEBUGGER = {
  retries: 2,
  minTimeout: 1000,
  factor: 2,
}

const resolvePackageJsonPath = (builder: string) => resolvePath(process.cwd(), `${builder}/package.json`)

const typingsInfo = async (workspace: string, account: string) => {
  const http = axios.create({
    baseURL: `http://builder-hub.vtex.${region()}.vtex.io/${account}/${workspace}`,
    timeout: builderHubTypingsInfoTimeout,
    headers: {
      'Authorization': getToken(),
    },
  })
  try {
    const res = await http.get(`/_v/builder/0/typings`)
    return res.data.typingsInfo
  } catch (e) {
    log.error('Unable to get typings info from vtex.builder-hub.')
    return {}
  }
}

const appTypingsURL = async (account: string, workspace: string, appName: string, appVersion: string, builder: string): Promise<string> => {
  const appId = await resolveAppId(appName, appVersion)
  const assetServerPath = isLinked({'version': appId}) ? 'private/typings/linked/v1' : 'public/typings/v1'
  return `https://${workspace}--${account}.${publicEndpoint()}/_v/${assetServerPath}/${appId}/${typingsPath}/${builder}`
}

const appsWithTypingsURLs = async (builder: string, account: string, workspace: string, appDependencies: Record<string, any>) => {
  const result: Record<string, any> = {}
  for (const [appName, appVersion] of Object.entries(appDependencies)) {
    try {
      result[appName] = await appTypingsURL(account, workspace, appName, appVersion, builder)
    } catch (e) {
      log.error(`Unable to generate typings URL for ${appName}@${appVersion}.`)
    }
  }
  return result
}

const runYarn = (relativePath: string) => {
  log.info(`Running yarn in ${relativePath}`)
  execSync(
    `${yarnPath} --force`,
    {stdio: 'inherit', cwd: `./${relativePath}`}
  )
  log.info('Finished running yarn')
}

const getTypings = async (manifest: Manifest, account: string, workspace: string) => {
  const typingsData = await typingsInfo(workspace, account)

  const buildersWithInjectedDeps =
    pipe(
      prop('builders'),
      mapObjIndexed(
        (version: string, builder: string) => {
          const builderTypingsData = prop(builder, typingsData)
          if (builderTypingsData && has(version, builderTypingsData)) {
            return ramdaPath([version, 'injectedDependencies'], builderTypingsData)
          }
          return null
        }
      ),
      ramdaReject(isNil)
    )(manifest)

  const buildersWithAppDeps =
    pipe(
      mapObjIndexed(
        (injectedDependencies) => merge(manifest.dependencies, injectedDependencies)
      ),
      ramdaReject(isEmpty)
    )(buildersWithInjectedDeps as Record<string, any>)

  await pipe(
    mapObjIndexed(
      async (appDeps: Record<string, any>, builder: string) => {
        const packageJsonPath = resolvePackageJsonPath(builder)
        if (await pathExists(packageJsonPath)) {
          const packageJson = await readJson(packageJsonPath)
          const oldDevDeps = packageJson.devDependencies || {}
          const oldTypingsEntries = filter(test(typingsURLRegex), oldDevDeps)
          const newTypingsEntries = await appsWithTypingsURLs(builder, account, workspace, appDeps)
          if (!equals(oldTypingsEntries, newTypingsEntries)) {
            const cleanOldDevDeps = ramdaReject(test(typingsURLRegex), oldDevDeps)
            await outputJson(
              packageJsonPath,
              {
                ...packageJson,
                ...{ 'devDependencies': { ...cleanOldDevDeps, ...newTypingsEntries } },
              },
              { spaces: '\t' }
            )
            try {
              runYarn(builder)
            } catch (e) {
              log.error(`Error running Yarn in ${builder}.`)
              await outputJson(packageJsonPath, packageJson)  // Revert package.json to original state.
            }

          }
        }
      }
    ),
    values,
    Promise.all
  )(buildersWithAppDeps as Record<string, any>)

}

const warnAndLinkFromStart = (appId: string, builder: Builder, extraData: { linkConfig: LinkConfig } = { linkConfig: null }) => {
  log.warn('Initial link requested by builder')
  performInitialLink(appId, builder, extraData)
  return null
}

const watchAndSendChanges = async (appId: string, builder: Builder, extraData : {linkConfig : LinkConfig}): Promise<any> => {
  const changeQueue: Change[] = []

  const onInitialLinkRequired = e => {
    const data = e.response && e.response.data
    if (data && data.code && data.code === 'initial_link_required') {
      return warnAndLinkFromStart(appId, builder, extraData)
    }
    throw e
  }

  const defaultPatterns = ['*/**', 'manifest.json', 'policies.json']
  const linkedDepsPatterns = map(path => join(path, '**'), getLinkedDepsDirs(extraData.linkConfig))

  const queueChange = (path: string, remove?: boolean) => {
    console.log(`${chalk.gray(moment().format('HH:mm:ss:SSS'))} - ${remove ? DELETE_SIGN : UPDATE_SIGN} ${path}`)
    changeQueue.push(pathToChange(path, remove))
    sendChanges()
  }

  const sendChanges = debounce(() => {
    builder.relinkApp(appId, changeQueue.splice(0, changeQueue.length))
      .catch(onInitialLinkRequired)
  }, 300)

  const pathToChange = (path: string, remove?: boolean): Change => ({
    content: remove ? null : readFileSync(resolvePath(root, path)).toString('base64'), path : pathModifier(path),
  })

  const moduleAndMetadata = toPairs(extraData.linkConfig.metadata)

  const mapLocalToBuiderPath = path => {
    const abs = resolvePath(root, path)
    for (const [module, modulePath] of moduleAndMetadata) {
      if (abs.startsWith(modulePath)) {
        return abs.replace(modulePath, join('.linked_deps', module))
      }
    }
    return path
  }

  const pathModifier = pipe(
    mapLocalToBuiderPath,
    path => path.split(sep).join('/'))

  const addIgnoreNodeModulesRule =
    (paths: Array<string | ((path: string) => boolean)>) =>
      paths.concat((path: string) => path.includes('node_modules'))

  const watcher = chokidar.watch([...defaultPatterns, ...linkedDepsPatterns], {
    atomic: stabilityThreshold,
    awaitWriteFinish: {
      stabilityThreshold,
    },
    cwd: root,
    ignoreInitial: true,
    ignored: addIgnoreNodeModulesRule(getIgnoredPaths(root)),
    persistent: true,
    usePolling: process.platform === 'win32',
  })

  return new Promise((resolve, reject) => {
    watcher
      .on('add', file => queueChange(file))
      .on('change', file => queueChange(file))
      .on('unlink', file => queueChange(file, true))
      .on('error', reject)
      .on('ready', resolve)
  })
}

const performInitialLink = async (appId: string, builder: Builder, extraData : {linkConfig : LinkConfig}): Promise<void> => {
  const linkConfig = await createLinkConfig(root)

  extraData.linkConfig = linkConfig

  const usedDeps = toPairs(linkConfig.metadata)
  if (usedDeps.length) {
    const plural = usedDeps.length > 1
    log.info(`The following local dependenc${plural ? 'ies are' : 'y is'} linked to your app:`)
    usedDeps.forEach(([dep, path]) => log.info(`${dep} (from: ${path})`))
    log.info(`If you don\'t want ${plural ? 'them' : 'it'} to be used by your vtex app, please unlink ${plural ? 'them' : 'it'}`)
  }

  const linkApp = async (bail: any, tryCount: number) => {
    // wrapper for builder.linkApp to be used with the retry function below.
    const [localFiles, linkedFiles] =
      await Promise.all([
        listLocalFiles(root).then(paths => map(pathToFileObject(root), paths)),
        getLinkedFiles(linkConfig),
      ])
    const filesWithContent = concat(localFiles, linkedFiles) as BatchStream[]

    if (tryCount === 1) {
      const linkedFilesInfo = linkedFiles.length ? `(${linkedFiles.length} from linked node modules)` : ''
      log.info(`Sending ${filesWithContent.length} file${filesWithContent.length > 1 ? 's' : ''} ${linkedFilesInfo}`)
      log.debug('Sending files')
      filesWithContent.forEach(p => log.debug(p.path))
    }

    if (tryCount > 1) {
      log.info(`Retrying...${tryCount-1}`)
    }

    const stickyHint = await getMostAvailableHost(appId, builder, N_HOSTS, AVAILABILITY_TIMEOUT)
    const linkOptions = { sticky: true, stickyHint }
    try {
      const { code } = await builder.linkApp(appId, filesWithContent, linkOptions)
      if (code !== 'build.accepted') {
        bail(new Error('Please, update your builder-hub to the latest version!'))
      }
    } catch (err) {
      const response = err.response
      const status = response.status
      const data = response && response.data
      const message = data.message
      const statusMessage = status ? `: Status ${status}` : ''
      log.error(`Error linking app${statusMessage} (try: ${tryCount})`)
      if (message) {
        log.error(`Message: ${message}`)
      }
      if (status && status < 500) {
        return
      }
      throw err
    }
  }
  await retry(linkApp, RETRY_OPTS_INITIAL_LINK)
}

export default async (options) => {
  await validateAppAction('link')
  const manifest = await getManifest()
  const builderHubMessage = await checkBuilderHubMessage('link')
  if (!isEmpty(builderHubMessage)) {
    await showBuilderHubMessage(builderHubMessage.message, builderHubMessage.prompt, manifest)
  }

  if (manifest.builders.render
    || manifest.builders['functions-ts']) {
    return legacyLink(options)
  }

  const appId = toAppLocator(manifest)
  const context = { account: getAccount(), workspace: getWorkspace(), environment: getEnvironment() }
  if (options.install || options.i) {
    await getTypings(manifest, context.account, context.workspace)
  }
  const { builder } = createClients(context, { timeout: 60000 })

  if (options.c || options.clean) {
    log.info('Requesting to clean cache in builder.')
    const { timeNano } = await builder.clean(appId)
    log.info(`Cache cleaned successfully in ${formatNano(timeNano)}`)
  }

  const onError = {
    build_failed: () => { log.error(`App build failed. Waiting for changes...`) },
    initial_link_required: () => warnAndLinkFromStart(appId, builder),
  }

  let debuggerStarted = false
  const onBuild = async () => {
    if (debuggerStarted) {
      return
    }
    const startDebugger = async () => {
      const port = await startDebuggerTunnel(manifest)
      if (!port) {
        throw new Error('Failed to start debugger.')
      }
      return port
    }
    try {
      const debuggerPort = await retry(startDebugger, RETRY_OPTS_DEBUGGER)
      debuggerStarted = true
      log.info(`Debugger tunnel listening on ${chalk.green(`:${debuggerPort}`)}. Go to ${chalk.blue('chrome://inspect')} in Google Chrome to debug your running application.`)
    } catch (e) {
      log.error(e.message)
    }
  }

  log.info(`Linking app ${appId}`)

  let unlistenBuild
  const extraData = { linkConfig: null }
  try {
    const buildTrigger = performInitialLink.bind(this, appId, builder, extraData)
    const [subject] = appId.split('@')
    if (options.watch === false) {
      await listenBuild(subject, buildTrigger, { waitCompletion: true })
      return
    }
    unlistenBuild = await listenBuild(subject, buildTrigger, { waitCompletion: false, onBuild, onError }).then(prop('unlisten'))
  } catch (e) {
    if (e.response) {
      const { data } = e.response
      if (data.code === 'routing_error' && /app_not_found.*vtex\.builder\-hub/.test(data.message)) {
        return log.error('Please install vtex.builder-hub in your account to enable app linking (vtex install vtex.builder-hub)')
      }

      if (data.code === 'link_on_production') {
        throw new CommandError(`Please use a dev workspace to link apps. Create one with (${chalk.blue('vtex use <workspace> -rp')}) to be able to link apps`)
      }
    }
    throw e
  }

  createInterface({ input: process.stdin, output: process.stdout })
    .on('SIGINT', () => {
      if (unlistenBuild) {
        unlistenBuild()
      }
      log.info('Your app is still in development mode.')
      log.info(`You can unlink it with: 'vtex unlink ${appId}'`)
      process.exit()
    })

  await watchAndSendChanges(appId, builder, extraData)
}
