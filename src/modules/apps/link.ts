import {Builder, Change} from '@vtex/api'
import * as chokidar from 'chokidar'
import * as debounce from 'debounce'
import {readFileSync} from 'fs'
import * as moment from 'moment'
import {resolve, sep} from 'path'
import {map} from 'ramda'

import {createInterface} from 'readline'
import log from '../../logger'
import {currentContext} from '../../conf'
import {createClients} from '../../clients'
import {logAll} from '../../sse'
import {getManifest} from '../../manifest'
import {toAppLocator} from '../../locator'
import {pathToFileObject, validateAppAction} from './utils'
import startDebuggerTunnel from './debugger'
import * as chalk from 'chalk'
import {listLocalFiles, getIgnoredPaths} from './file'
import {getAccount, getWorkspace} from '../../conf'
import {formatNano} from '../utils'
import legacyLink from './legacyLink'

const root = process.cwd()
const DELETE_SIGN = chalk.red('D')
const UPDATE_SIGN = chalk.blue('U')

const pathToChange = (path: string, remove?: boolean): Change => ({
  path: path.split(sep).join('/'),
  content: remove ? null : readFileSync(resolve(root, path)).toString('base64'),
})

const checkBuildFailed = (e) => {
  if (e.response) {
    const {data, status} = e.response
    if (status === 400 && data.code === 'build_failed') {
      log.error(`App build failed. Waiting for changes...`)
      return true
    }
  }
  throw e
}

const watchAndSendChanges = (appId, builder: Builder, performInitialLink) => {
  const changeQueue: Change[] = []

  const queueChange = (path: string, remove?: boolean) => {
    console.log(`${chalk.gray(moment().format('HH:mm:ss:SSS'))} - ${remove ? DELETE_SIGN : UPDATE_SIGN} ${path}`)
    changeQueue.push(pathToChange(path, remove))
    sendChanges()
  }

  const initialLinkRequired = e => {
    const data = e.response && e.response.data
    if (data && data.code && data.code === 'initial_link_required') {
      log.warn('Initial link requested by builder')
      performInitialLink()
      return null
    }
    throw e
  }

  const sendChanges = debounce(() => {
    builder.relinkApp(appId, changeQueue.splice(0, changeQueue.length))
    .catch(initialLinkRequired)
    .catch(checkBuildFailed)
  }, 50)

  const watcher = chokidar.watch(['*/**', 'manifest.json', 'policies.json'], {
    cwd: root,
    persistent: true,
    ignoreInitial: true,
    ignored: getIgnoredPaths(root),
    usePolling: true,
    awaitWriteFinish: {
      stabilityThreshold: 500,
    },
    atomic: true,
  })
  return new Promise((resolve, reject) => {
    watcher
    .on('add', (file, {size}) => size > 0 ? queueChange(file) : null)
    .on('change', (file, {size}) => {
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
  await validateAppAction()
  const manifest = await getManifest()

  if (manifest.builders['render']
    || manifest.builders['functions-ts']
    || manifest.name === 'builder-hub') {
    return legacyLink(options)
  }

  const appId = toAppLocator(manifest)
  const unlisten = logAll(currentContext, log.level, `${manifest.vendor}.${manifest.name}`)
  const context = {account: getAccount(), workspace: getWorkspace(), timeout: 60000}
  const {builder} = createClients(context)

  const performInitialLink = async () => {
    const paths = await listLocalFiles(root)
    const filesWithContent = map(pathToFileObject(root), paths)

    log.debug('Sending files:')
    paths.forEach(p => log.debug(p))
    log.info(`Sending ${paths.length} file` + (paths.length > 1 ? 's' : ''))

    const {timeNano} = await builder.linkApp(appId, filesWithContent)
    log.info(`Build finished successfully in ${formatNano(timeNano)}`)
  }

  if (options.c || options.clean) {
    log.info('Requesting to clean cache in builder.')
    const {timeNano} = await builder.clean(appId)
    log.info(`Cache cleaned successfully in ${formatNano(timeNano)}`)
  }

  log.info(`Linking app ${appId}`)

  try {
    await performInitialLink()
  } catch (e) {
    if (e.response) {
      const {data} = e.response
      if (data.code === 'routing_error' && /app_not_found.*vtex\.builder\-hub/.test(data.message)) {
        unlisten()
        return log.error('Please install vtex.builder-hub in your account to enable app linking (vtex install vtex.builder-hub)')
      }
    }
    if (!checkBuildFailed(e)) {
      throw e
    }
  }

  await watchAndSendChanges(appId, builder, performInitialLink)

  const debuggerPort = await startDebuggerTunnel(manifest)
  log.info(`Debugger tunnel listening on ${chalk.green(`:${debuggerPort}`)}`)

  createInterface({input: process.stdin, output: process.stdout})
    .on('SIGINT', () => {
      unlisten()
      log.info('Your app is still in development mode.')
      log.info(`You can unlink it with: 'vtex unlink ${appId}'`)
      process.exit()
    })
}
