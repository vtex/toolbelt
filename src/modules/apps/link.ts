import * as retry from 'async-retry'
import * as bluebird from 'bluebird'
import chalk from 'chalk'
import * as chokidar from 'chokidar'
import * as debounce from 'debounce'
import { readFileSync } from 'fs'
import * as moment from 'moment'
import { join, resolve as resolvePath, sep } from 'path'
import { concat, intersection, isEmpty, map, pipe, prop, toPairs } from 'ramda'
import { createInterface } from 'readline'
import { createClients } from '../../clients'
import { getAccount, getEnvironment, getWorkspace } from '../../conf'
import { CommandError } from '../../errors'
import { ManifestEditor } from '../../lib/manifest'
import { default as log, default as logger } from '../../logger'
import { getAppRoot } from '../../manifest'
import { listenBuild } from '../build'
import { default as setup } from '../setup'
import { fixPinnedDependencies, formatNano, runYarnIfPathExists } from '../utils'
import startDebuggerTunnel from './debugger'
import { createLinkConfig, getIgnoredPaths, getLinkedDepsDirs, getLinkedFiles, listLocalFiles } from './file'
import { ChangeSizeLimitError, ChangeToSend, ProjectSizeLimitError, ProjectUploader } from './ProjectUploader'
import { checkBuilderHubMessage, pathToFileObject, showBuilderHubMessage, validateAppAction } from './utils'

const root = getAppRoot()
const DELETE_SIGN = chalk.red('D')
const UPDATE_SIGN = chalk.blue('U')
const stabilityThreshold = process.platform === 'darwin' ? 100 : 200

const buildersToStartDebugger = ['node']
const buildersToRunLocalYarn = ['react', 'node']
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

const shouldStartDebugger = (manifest: ManifestEditor) => {
  const buildersThatWillUseDebugger = intersection(manifest.builderNames, buildersToStartDebugger)
  return buildersThatWillUseDebugger.length > 0
}

const warnAndLinkFromStart = (
  projectUploader: ProjectUploader,
  unsafe: boolean,
  extraData: { linkConfig: LinkConfig } = { linkConfig: null }
) => {
  log.warn('Initial link requested by builder')
  performInitialLink(projectUploader, extraData, unsafe)
  return null
}

const watchAndSendChanges = async (
  projectUploader: ProjectUploader,
  extraData: { linkConfig: LinkConfig },
  unsafe: boolean
): Promise<any> => {
  const changeQueue: ChangeToSend[] = []

  const onInitialLinkRequired = e => {
    const data = e.response && e.response.data
    if (data && data.code && data.code === 'initial_link_required') {
      return warnAndLinkFromStart(projectUploader, unsafe, extraData)
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

  const sendChanges = debounce(async () => {
    try {
      return await projectUploader.sendToRelink(changeQueue.splice(0, changeQueue.length), {
        tsErrorsAsWarnings: unsafe,
      })
    } catch (err) {
      if (err instanceof ChangeSizeLimitError) {
        logger.error(err.message)
        process.exit(1)
      }
      onInitialLinkRequired(err)
    }
  }, 1000)

  const pathToChange = (path: string, remove?: boolean): ChangeToSend => {
    const content = remove ? null : readFileSync(resolvePath(root, path)).toString('base64')
    const byteSize = remove ? 0 : Buffer.byteLength(content)
    return {
      content,
      byteSize,
      path: pathModifier(path),
    }
  }

  const moduleAndMetadata = toPairs(extraData.linkConfig.metadata)

  const mapLocalToBuiderPath = path => {
    const abs = resolvePath(root, path)
    for (const [module, modulePath] of moduleAndMetadata as any) {
      if (abs.startsWith(modulePath)) {
        return abs.replace(modulePath, join('.linked_deps', module))
      }
    }
    return path
  }

  const pathModifier = pipe(mapLocalToBuiderPath, path => path.split(sep).join('/'))

  const addIgnoreNodeModulesRule = (paths: Array<string | ((path: string) => boolean)>) =>
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

const performInitialLink = async (
  projectUploader: ProjectUploader,
  extraData: { linkConfig: LinkConfig },
  unsafe: boolean
): Promise<void> => {
  const linkConfig = await createLinkConfig(root)

  extraData.linkConfig = linkConfig

  const usedDeps = toPairs(linkConfig.metadata)
  if (usedDeps.length) {
    const plural = usedDeps.length > 1
    log.info(`The following local dependenc${plural ? 'ies are' : 'y is'} linked to your app:`)
    usedDeps.forEach(([dep, path]) => log.info(`${dep} (from: ${path})`))
    log.info(
      `If you don\'t want ${plural ? 'them' : 'it'} to be used by your vtex app, please unlink ${
        plural ? 'them' : 'it'
      }`
    )
  }

  const linkApp = async (bail: any, tryCount: number) => {
    // wrapper for builder.linkApp to be used with the retry function below.
    const [localFiles, linkedFiles] = await Promise.all([
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
      log.info(`Retrying...${tryCount - 1}`)
    }

    try {
      const { code } = await projectUploader.sendToLink(filesWithContent, { tsErrorsAsWarnings: unsafe })
      if (code !== 'build.accepted') {
        bail(new Error('Please, update your builder-hub to the latest version!'))
      }
    } catch (err) {
      if (err instanceof ProjectSizeLimitError) {
        log.error(err.message)
        process.exit(1)
      }

      if (err.status) {
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
      }

      throw err
    }
  }
  await retry(linkApp, RETRY_OPTS_INITIAL_LINK)
}

export default async options => {
  await validateAppAction('link')
  const unsafe = !!(options.unsafe || options.u)
  const manifest = await ManifestEditor.getManifestEditor()
  await manifest.writeSchema()

  const builderHubMessage = await checkBuilderHubMessage('link')
  if (!isEmpty(builderHubMessage)) {
    await showBuilderHubMessage(builderHubMessage.message, builderHubMessage.prompt, manifest)
  }

  const appId = manifest.appLocator
  const context = { account: getAccount(), workspace: getWorkspace(), environment: getEnvironment() }
  const { builder } = createClients(context, { timeout: 60000 })
  const projectUploader = ProjectUploader.getProjectUploader(appId, builder)

  if (options.setup || options.s) {
    await setup({ 'ignore-linked': false })
  }
  try {
    const aux = await builder.getPinnedDependencies()
    const pinnedDeps: Map<string, string> = new Map(Object.entries(aux))
    await bluebird.map(buildersToRunLocalYarn, fixPinnedDependencies(pinnedDeps), { concurrency: 1 })
  } catch (e) {
    log.info('Failed to check for pinned dependencies')
  }
  // Always run yarn locally for some builders
  map(runYarnIfPathExists, buildersToRunLocalYarn)

  if (options.c || options.clean) {
    log.info('Requesting to clean cache in builder.')
    const { timeNano } = await builder.clean(appId)
    log.info(`Cache cleaned successfully in ${formatNano(timeNano)}`)
  }

  const onError = {
    build_failed: () => {
      log.error(`App build failed. Waiting for changes...`)
    },
    initial_link_required: () => warnAndLinkFromStart(projectUploader, unsafe),
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
    if (shouldStartDebugger(manifest)) {
      try {
        const debuggerPort = await retry(startDebugger, RETRY_OPTS_DEBUGGER)
        debuggerStarted = true
        log.info(
          `Debugger tunnel listening on ${chalk.green(`:${debuggerPort}`)}. Go to ${chalk.blue(
            'chrome://inspect'
          )} in Google Chrome to debug your running application.`
        )
      } catch (e) {
        log.error(e.message)
      }
    }
  }

  log.info(`Linking app ${appId}`)

  let unlistenBuild
  const extraData = { linkConfig: null }
  try {
    const buildTrigger = performInitialLink.bind(this, projectUploader, extraData, unsafe)
    const [subject] = appId.split('@')
    if (options.watch === false) {
      await listenBuild(subject, buildTrigger, { waitCompletion: true })
      return
    }
    unlistenBuild = await listenBuild(subject, buildTrigger, { waitCompletion: false, onBuild, onError }).then(
      prop('unlisten')
    )
  } catch (e) {
    if (e.response) {
      const { data } = e.response
      if (data.code === 'routing_error' && /app_not_found.*vtex\.builder\-hub/.test(data.message)) {
        return log.error(
          'Please install vtex.builder-hub in your account to enable app linking (vtex install vtex.builder-hub)'
        )
      }

      if (data.code === 'link_on_production') {
        throw new CommandError(
          `Please use a dev workspace to link apps. Create one with (${chalk.blue(
            'vtex use <workspace> -rp'
          )}) to be able to link apps`
        )
      }

      if (data.code === 'bad_toolbelt_version') {
        return log.error(`${data.message} To update just run ${chalk.bold.green('yarn global add vtex')}.`)
      }
    }
    throw e
  }

  createInterface({ input: process.stdin, output: process.stdout }).on('SIGINT', () => {
    if (unlistenBuild) {
      unlistenBuild()
    }
    log.info('Your app is still in development mode.')
    log.info(`You can unlink it with: 'vtex unlink ${appId}'`)
    process.exit()
  })

  await watchAndSendChanges(projectUploader, extraData, unsafe)
}
