import { Builder, Change } from '@vtex/api'
import chalk from 'chalk'
import * as chokidar from 'chokidar'
import * as debounce from 'debounce'
import { readFileSync } from 'fs'
import * as moment from 'moment'
import { resolve as resolvePath, sep } from 'path'
import { map } from 'ramda'
import { createInterface } from 'readline'


import { createClients } from '../../clients'
import { getAccount, getWorkspace } from '../../conf'
import { toAppLocator } from '../../locator'
import log from '../../logger'
import { getManifest } from '../../manifest'
import { listenBuild } from '../build'
import { formatNano } from '../utils'
import startDebuggerTunnel from './debugger'
import { getIgnoredPaths, listLocalFiles } from './file'
import legacyLink from './legacyLink'
import { pathToFileObject, validateAppAction } from './utils'



const root = process.cwd()
const DELETE_SIGN = chalk.red('D')
const UPDATE_SIGN = chalk.blue('U')
const stabilityThreshold = process.platform === 'win32' ? 200 : 50

const pathToChange = (path: string, remove?: boolean): Change => ({
  content: remove ? null : readFileSync(resolvePath(root, path)).toString('base64'),
  path: path.split(sep).join('/'),
})

const warnAndLinkFromStart = (performInitialLink) => {
  log.warn('Initial link requested by builder')
  performInitialLink()
  return null
}

const watchAndSendChanges = (appId, builder: Builder, performInitialLink) => {
  const changeQueue: Change[] = []

  const onInitialLinkRequired = e => {
    const data = e.response && e.response.data
    if (data && data.code && data.code === 'initial_link_required') {
      return warnAndLinkFromStart(performInitialLink)
    }
    throw e
  }

  const queueChange = (path: string, remove?: boolean) => {
    console.log(`${chalk.gray(moment().format('HH:mm:ss:SSS'))} - ${remove ? DELETE_SIGN : UPDATE_SIGN} ${path}`)
    changeQueue.push(pathToChange(path, remove))
    sendChanges()
  }

  const sendChanges = debounce(() => {
    builder.relinkApp(appId, changeQueue.splice(0, changeQueue.length))
      .catch(onInitialLinkRequired)
  }, 10)

  const watcher = chokidar.watch(['*/**', 'manifest.json', 'policies.json'], {
    atomic: true,
    awaitWriteFinish: {
      stabilityThreshold,
    },
    cwd: root,
    ignoreInitial: true,
    ignored: getIgnoredPaths(root),
    persistent: true,
    usePolling: true,
  })
  return new Promise((resolve, reject) => {
    watcher
      .on('add', (file, { size }) => size > 0 ? queueChange(file) : null)
      .on('change', (file, { size }) => {
        return size > 0
          ? queueChange(file)
          : queueChange(file, true)
      })
      .on('unlink', file => queueChange(file, true))
      .on('error', reject)
      .on('ready', resolve)
  })
}

export default async (options) => {
  await validateAppAction('link')
  const manifest = await getManifest()

  if (manifest.builders.render
    || manifest.builders['functions-ts']
    || manifest.name === 'builder-hub') {
    return legacyLink(options)
  }

  const appId = toAppLocator(manifest)
  const context = { account: getAccount(), workspace: getWorkspace() }
  const { builder } = createClients(context, { timeout: 60000 })

  if (options.c || options.clean) {
    log.info('Requesting to clean cache in builder.')
    const { timeNano } = await builder.clean(appId)
    log.info(`Cache cleaned successfully in ${formatNano(timeNano)}`)
  }

  const performInitialLink = async () => {
    const paths = await listLocalFiles(root)
    const filesWithContent = map(pathToFileObject(root), paths)

    log.debug('Sending files:')
    paths.forEach(p => log.debug(p))
    log.info(`Sending ${paths.length} file` + (paths.length > 1 ? 's' : ''))

    const { code } = await builder.linkApp(appId, filesWithContent)
    if (code !== 'build.accepted') {
      throw new Error('Please, update your builder-hub to the latest version!')
    }
  }

  const onError = {
    build_failed: () => { log.error(`App build failed. Waiting for changes...`) },
    initial_link_required: () => warnAndLinkFromStart(performInitialLink),
  }

  let debuggerStarted = false
  const onBuild = async () => {
    if (debuggerStarted) {
      return
    }
    const debuggerPort = await startDebuggerTunnel(manifest)
    debuggerStarted = true
    log.info(`Debugger tunnel listening on ${chalk.green(`:${debuggerPort}`)}`)
  }

  log.info(`Linking app ${appId}`)

  let unlistenBuild
  try {
    const { unlisten } = await listenBuild(appId, performInitialLink, { waitCompletion: false, onBuild, onError })
    unlistenBuild = unlisten
  } catch (e) {
    if (e.response) {
      const { data } = e.response
      if (data.code === 'routing_error' && /app_not_found.*vtex\.builder\-hub/.test(data.message)) {
        return log.error('Please install vtex.builder-hub in your account to enable app linking (vtex install vtex.builder-hub)')
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

  await watchAndSendChanges(appId, builder, performInitialLink)
}
