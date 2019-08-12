import { Builder } from '@vtex/api'
import * as retry from 'async-retry'
import axios from 'axios'
import * as bluebird from 'bluebird'
import chalk from 'chalk'
import { compose, concat, intersection, isEmpty, keys, map, not, prop, toPairs } from 'ramda'
import { createInterface } from 'readline'
import { createClients } from '../../clients'
import { getAccount, getEnvironment, getToken, getWorkspace } from '../../conf'
import { region } from '../../env'
import { CommandError } from '../../errors'
import { getSavedOrMostAvailableHost } from '../../host'
import { toAppLocator } from '../../locator'
import log from '../../logger'
import { getAppRoot, getManifest, writeManifestSchema } from '../../manifest'
import { listenBuild } from '../build'
import { fixPinnedDependencies, getPinnedDependencies } from '../utils'
import { runYarnIfPathExists } from '../utils'
import startDebuggerTunnel from './debugger'
import { createLinkConfig, getLinkedFiles, listLocalFiles } from './file'
import legacyLink from './legacyLink'
import { checkBuilderHubMessage, pathToFileObject, showBuilderHubMessage, validateAppAction } from './utils'

const root = getAppRoot()
const AVAILABILITY_TIMEOUT = 1000
const N_HOSTS = 3
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
const account = getAccount()
const workspace = getWorkspace()
const builderHttp = axios.create({
  baseURL: `http://builder-hub.vtex.${region()}.vtex.io/${account}/${workspace}`,
  timeout: 2000,
  headers: {
    'Authorization': getToken(),
  },
})

const shouldStartDebugger = (manifest: Manifest) => compose<Manifest, any, string[], string[], boolean, boolean>(
  not,
  isEmpty,
  intersection(buildersToStartDebugger),
  keys,
  prop('builders')
)(manifest)


const warnAndLinkFromStart = (appId: string, builder: Builder, unsafe: boolean, extraData: { linkConfig: LinkConfig } = { linkConfig: null }) => {
  log.warn('Initial link requested by builder')
  performInitialLink(appId, builder, extraData, unsafe)
  return null
}

const performInitialLink = async (appId: string, builder: Builder, extraData : {linkConfig : LinkConfig}, unsafe: boolean): Promise<void> => {
  const linkConfig = await createLinkConfig(root)

  extraData.linkConfig = linkConfig

  const usedDeps = toPairs(linkConfig.metadata)
  if (usedDeps.length) {
    const plural = usedDeps.length > 1
    log.info(`The following local dependenc${plural ? 'ies are' : 'y is'} linked to your app:`)
    usedDeps.forEach(([dep, path]) => log.info(`${dep} (from: ${path})`))
    log.info(`If you don\'t want ${plural ? 'them' : 'it'} to be used by your vtex app, please unlink ${plural ? 'them' : 'it'}`)
  }

  const testApp = async (bail: any, tryCount: number) => {
    const test = true
    const [localFiles, linkedFiles] =
      await Promise.all([
        listLocalFiles(root, test).then(paths => map(pathToFileObject(root), paths)),
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

    const stickyHint = await getSavedOrMostAvailableHost(appId, builder, N_HOSTS, AVAILABILITY_TIMEOUT)
    const linkOptions = { sticky: true, stickyHint }
    try {
      const { code } = await builder.testApp(appId, filesWithContent, linkOptions, { tsErrorsAsWarnings: unsafe })
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
  await retry(testApp, RETRY_OPTS_INITIAL_LINK)
}

export default async (options) => {
  await validateAppAction('test')
  const unsafe = !!(options.unsafe || options.u)
  const manifest = await getManifest()
  try {
    await writeManifestSchema()
  } catch(e) {
    log.debug('Failed to write schema on manifest.')
  }
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

  try {
    const aux = await getPinnedDependencies(builderHttp)
    const pinnedDeps : Map<string, string> = new Map(Object.entries(aux))
    await bluebird.map(buildersToRunLocalYarn, fixPinnedDependencies(pinnedDeps), { concurrency: 1 })
  } catch(e) {
    log.info('Failed to check for pinned dependencies')
  }
  // Always run yarn locally for some builders
  map(runYarnIfPathExists, buildersToRunLocalYarn)

  const { builder } = createClients(context, { timeout: 60000 })

  const onError = {
    build_failed: () => { log.error(`App build failed. Waiting for changes...`) },
    initial_link_required: () => warnAndLinkFromStart(appId, builder, unsafe),
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
        log.info(`Debugger tunnel listening on ${chalk.green(`:${debuggerPort}`)}. Go to ${chalk.blue('chrome://inspect')} in Google Chrome to debug your running application.`)
      } catch (e) {
        log.error(e.message)
      }
    }
  }

  log.info(`Linking app ${appId}`)

  let unlistenBuild
  const extraData = { linkConfig: null }
  try {
    const buildTrigger = performInitialLink.bind(this, appId, builder, extraData, unsafe)
    const [subject] = appId.split('@')
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
}
