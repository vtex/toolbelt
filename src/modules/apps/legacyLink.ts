import axios from 'axios'
import * as Bluebird from 'bluebird'
import * as debounce from 'debounce'
import * as moment from 'moment'
import { prop, uniqBy } from 'ramda'
import { createInterface } from 'readline'

import chalk from 'chalk'
import { changesToString } from '../../apps'
import { apps, events } from '../../clients'
import { getAccount, getToken, getWorkspace } from '../../conf'
import { currentContext } from '../../conf'
import { region } from '../../env'
import { toAppLocator, toMajorLocator } from '../../locator'
import log from '../../logger'
import { getManifest } from '../../manifest'
import { logAll } from '../../sse'
import startDebuggerTunnel from './debugger'
import { addChangeContent, listLocalFiles, watch } from './file'
import { hasServiceOnBuilders } from './utils'

const { link, patch } = apps
const root = process.cwd()
const pathProp = prop('path')

const mapFilesToChanges = (files: string[]): Change[] =>
  files.map((path): Change => ({ path, action: 'save' }))

const sendChanges = (() => {
  let queue = []
  const publishPatch = debounce(
    (data: Manifest) => {
      const locator = toMajorLocator(data)
      log.debug(`Sending ${queue.length} change` + (queue.length > 1 ? 's' : ''))
      return patch(locator, queue)
        .tap(() => console.log(changesToString(queue, moment().format('HH:mm:ss'))))
        .tap(() => { queue = [] })
    },
    50
  )
  return async (changes: Change[]) => {
    if (changes.length === 0) {
      return
    }
    queue = uniqBy(pathProp, queue.concat(changes).reverse())
    const manifest = await getManifest()
    return publishPatch(manifest)
  }
})()

const cleanCache = (manifest: Manifest): Bluebird<void> => {
  return events.sendEvent('-', 'cleanCache', {
    id: toAppLocator(manifest),
    type: 'clean',
  })
}

const checkAppStatus = (manifest: Manifest) => {
  const { name, vendor, version } = manifest
  const http = axios.create({
    baseURL: `http://${name}.${vendor}.${region()}.vtex.io/${getAccount()}/${getWorkspace()}`,
    headers: {
      Authorization: getToken(),
    },
  })
  return http.get(`/_status?__v=${version}`)
}

const CACHE_CLEAN_AWAIT_MS = 5000

export default async (options) => {
  const manifest = await getManifest()
  const unlisten = logAll(currentContext, log.level, `${manifest.vendor}.${manifest.name}`)

  if (options.c || options.clean) {
    log.info('Requesting to clean cache in builder.')
    cleanCache(manifest)
    await Promise.delay(CACHE_CLEAN_AWAIT_MS)
  }

  log.info('Linking legacy app', `${toAppLocator(manifest)}`)
  const majorLocator = toMajorLocator(manifest)
  const folder = options.o || options.only
  const paths = await listLocalFiles(root, folder)
  const changes = mapFilesToChanges(paths)
  const batch = addChangeContent(changes)

  log.debug('Sending files:')
  paths.forEach(p => log.debug(p))
  log.info(`Sending ${batch.length} file` + (batch.length > 1 ? 's' : ''))
  await link(majorLocator, batch)
  log.info(`${batch.length} file` + (batch.length > 1 ? 's' : '') + ' sent')

  const debuggerPort = await startDebuggerTunnel(manifest)
  if (debuggerPort) {
    log.info(`Debugger tunnel listening on ${chalk.green(`:${debuggerPort}`)}`)
  }

  if (hasServiceOnBuilders(manifest)) {
    await checkAppStatus(manifest)
  }

  await watch(root, sendChanges, folder)

  createInterface({ input: process.stdin, output: process.stdout })
    .on('SIGINT', () => {
      unlisten()
      log.info('Your app is still in development mode.')
      log.info(`You can unlink it with: 'vtex unlink ${majorLocator}'`)
      process.exit()
    })
}
