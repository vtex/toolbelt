import retry from 'async-retry'
import chalk from 'chalk'
import chokidar from 'chokidar'
import debounce from 'debounce'
import { readFileSync } from 'fs'
import moment from 'moment'
import { join, resolve as resolvePath, sep } from 'path'
import { concat, intersection, isEmpty, map, pipe, prop } from 'ramda'
import { createInterface } from 'readline'

import { createClients } from '../../clients'
import { getAccount, getEnvironment, getWorkspace } from '../../conf'
import { CommandError } from '../../errors'
import log from '../../logger'
import { getAppRoot } from '../../manifest'
import { setup } from '../setup'
import { ManifestEditor } from '../../utils/manifest'
import { ProjectUploader, ProjectSizeLimitError, ChangeToSend, ChangeSizeLimitError } from '../../utils/ProjectUploader'
import { YarnFilesManager } from '../../utils/files/YarnFilesManager'
import { listLocalFiles, getIgnoredPaths } from '../../utils/file'
import { createPathToFileObject } from '../../utils/files/ProjectFilesManager'
import { validateAppAction, checkBuilderHubMessage, showBuilderHubMessage, runYarnIfPathExists, formatNano } from '../../utils/utils'
import { PinnedDeps, fixPinnedDependencies } from '../../utils/pinnedDependencies'
import startDebuggerTunnel from '../../utils/debugger'
import { listenBuild } from '../../utils/build'

let nodeNotifier
if (process.platform !== 'win32') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  nodeNotifier = require('node-notifier')
}

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

const performInitialLink = async (
  projectUploader: ProjectUploader,
  extraData: { yarnFilesManager: YarnFilesManager },
  unsafe: boolean
): Promise<void> => {
  const yarnFilesManager = await YarnFilesManager.createFilesManager(root)
  extraData.yarnFilesManager = yarnFilesManager
  yarnFilesManager.logSymlinkedDependencies()

  const linkApp = async (bail: any, tryCount: number) => {
    // wrapper for builder.linkApp to be used with the retry function below.
    const [localFiles, linkedFiles] = await Promise.all([
      listLocalFiles(root).then(paths => map(createPathToFileObject(root), paths)),
      yarnFilesManager.getYarnLinkedFiles(),
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

      const data = err?.response?.data
      if (data?.code === 'bad_toolbelt_version') {
        log.error(`${data.message} To update just run ${chalk.bold.green('yarn global add vtex')}.`)
        process.exit(1)
      }

      if (err.status) {
        const { response } = err
        const { status } = response
        const { message } = data
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

const warnAndLinkFromStart = (
  projectUploader: ProjectUploader,
  unsafe: boolean,
  extraData: { yarnFilesManager: YarnFilesManager } = { yarnFilesManager: null }
) => {
  log.warn('Initial link requested by builder')
  performInitialLink(projectUploader, extraData, unsafe)
  return null
}

const watchAndSendChanges = async (
  appId: string,
  projectUploader: ProjectUploader,
  { yarnFilesManager }: { yarnFilesManager: YarnFilesManager },
  unsafe: boolean
): Promise<any> => {
  const changeQueue: ChangeToSend[] = []

  const onInitialLinkRequired = e => {
    const data = e.response && e.response.data
    if (data?.code === 'initial_link_required') {
      return warnAndLinkFromStart(projectUploader, unsafe, { yarnFilesManager })
    }
    throw e
  }

  const defaultPatterns = ['*/**', 'manifest.json', 'policies.json']
  const linkedDepsPatterns = map(path => join(path, '**'), yarnFilesManager.symlinkedDepsDirs)

  const pathModifier = pipe(
    (path: string) => yarnFilesManager.maybeMapLocalYarnLinkedPathToProjectPath(path, root),
    path => path.split(sep).join('/')
  )

  const pathToChange = (path: string, remove?: boolean): ChangeToSend => {
    const content = remove ? null : readFileSync(resolvePath(root, path)).toString('base64')
    const byteSize = remove ? 0 : Buffer.byteLength(content)
    return {
      content,
      byteSize,
      path: pathModifier(path),
    }
  }

  const sendChanges = debounce(async () => {
    try {
      return await projectUploader.sendToRelink(changeQueue.splice(0, changeQueue.length), {
        tsErrorsAsWarnings: unsafe,
      })
    } catch (err) {
      nodeNotifier?.notify({
        title: appId,
        message: 'Link died',
      })

      if (err instanceof ChangeSizeLimitError) {
        log.error(err.message)
        process.exit(1)
      }
      onInitialLinkRequired(err)
    }
  }, 1000)

  const queueChange = (path: string, remove?: boolean) => {
    console.log(`${chalk.gray(moment().format('HH:mm:ss:SSS'))} - ${remove ? DELETE_SIGN : UPDATE_SIGN} ${path}`)
    changeQueue.push(pathToChange(path, remove))
    sendChanges()
  }

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

export async function appsLink(setupFlag, clean, unsafe, noWatch) {
  await validateAppAction('link')
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

  if (setupFlag) {
    await setup(false)
  }
  try {
    const pinnedDeps: PinnedDeps = await builder.getPinnedDependencies()
    await fixPinnedDependencies(pinnedDeps, buildersToRunLocalYarn, manifest.builders)
  } catch (e) {
    log.info('Failed to check for pinned dependencies')
    log.debug(e)
  }
  // Always run yarn locally for some builders
  map(runYarnIfPathExists, buildersToRunLocalYarn)

  if (clean) {
    log.info('Requesting to clean cache in builder.')
    const { timeNano } = await builder.clean(appId)
    log.info(`Cache cleaned successfully in ${formatNano(timeNano)}`)
  }

  const onError = {
    // eslint-disable-next-line @typescript-eslint/camelcase
    build_failed: () => {
      log.error('App build failed. Waiting for changes...')
    },
    // eslint-disable-next-line @typescript-eslint/camelcase
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
        // eslint-disable-next-line require-atomic-updates
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
  const extraData = { yarnFilesManager: null }
  try {
    const buildTrigger = performInitialLink.bind(this, projectUploader, extraData, unsafe)
    const [subject] = appId.split('@')
    if (noWatch === false) {
      await listenBuild(subject, buildTrigger, { waitCompletion: true })
      return
    }
    unlistenBuild = await listenBuild(subject, buildTrigger, { waitCompletion: false, onBuild, onError }).then(
      prop('unlisten')
    )
  } catch (e) {
    if (e.response) {
      const { data } = e.response
      if (data.code === 'routing_error' && /app_not_found.*vtex\.builder-hub/.test(data.message)) {
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

  await watchAndSendChanges(appId, projectUploader, extraData, unsafe)
}
