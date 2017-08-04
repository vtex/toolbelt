import * as moment from 'moment'
import {uniqBy, prop} from 'ramda'
import * as debounce from 'debounce'
import * as Bluebird from 'bluebird'
import {createInterface} from 'readline'

import log from '../../logger'
import {currentContext} from '../../conf'
import {apps, colossus} from '../../clients'
import {logAll} from '../../sse'
import {getManifest} from '../../manifest'
import {changesToString} from '../../apps'
import {toMajorLocator} from '../../locator'
import {id, validateAppAction} from './utils'
import startDebuggerTunnel from './debugger'
import * as chalk from 'chalk'
import {watch, listLocalFiles, addChangeContent} from './file'

const {link} = apps
const root = process.cwd()
const pathProp = prop('path')
const cleanAll: Change = {path: '*', action: 'remove'}

const mapFilesToChanges = (files: string[]): Change[] =>
  [cleanAll].concat(files.map((path): Change => ({path, action: 'save'})))

const sendChanges = (() => {
  let queue = []
  const publishPatch = debounce(
    (data: Manifest) => {
      const locator = toMajorLocator(data.vendor, data.name, data.version)
      log.debug(`Sending ${queue.length} change` + (queue.length > 1 ? 's' : ''))
      return link(locator, queue)
        .tap(() => console.log(changesToString(queue, moment().format('HH:mm:ss'))))
        .tap(() => { queue = [] })
        .catch(err => { throw err })
    },
    50,
  )
  return async (changes: Change[]) => {
    if (changes.length === 0) {
      return
    }
    queue = uniqBy(pathProp, queue.concat(changes).reverse())
    const manifest = getManifest()
    return publishPatch(manifest)
  }
})()

const cleanCache = (manifest: Manifest): Bluebird<void> => {
  return colossus.sendEvent('vtex.toolbelt', '-', 'cleanCache', {
    id: `${manifest.vendor}.${manifest.name}@.${manifest.version}`,
    type: 'clean',
  })
}

const CACHE_CLEAN_AWAIT_MS = 5000

export default async (options) => {
  await validateAppAction()
    const manifest = await getManifest()
  const unlisten = logAll(currentContext, log.level, `${manifest.vendor}.${manifest.name}`)

  if (options.c || options.clean) {
    log.info('Requesting to clean cache in builder.')
      cleanCache(manifest)
    await Promise.delay(CACHE_CLEAN_AWAIT_MS)
  }

  log.info('Linking app', `${id(manifest)}`)
  const majorLocator = toMajorLocator(manifest.vendor, manifest.name, manifest.version)
  const folder = options.o || options.only
  const paths = await listLocalFiles(root, folder)
  const changes = mapFilesToChanges(paths)
  const batch = addChangeContent(changes)

  log.debug('Sending files:')
  paths.forEach(p => log.debug(p))
  log.info(`Sending ${batch.length} file` + (batch.length > 1 ? 's' : ''))
  await link(majorLocator, batch)
  log.info(`${batch.length} file` + (batch.length > 1 ? 's' : '') + ' sent')
  await watch(root, sendChanges, folder)

  const debuggerPort = await startDebuggerTunnel(manifest)
  log.info(`Debugger tunnel listening on ${chalk.green(`:${debuggerPort}`)}`)

  createInterface({input: process.stdin, output: process.stdout})
    .on('SIGINT', () => {
      unlisten()
      log.info('Your app is still in development mode.')
      log.info(`You can unlink it with: 'vtex unlink ${majorLocator}'`)
      process.exit()
    })
}
