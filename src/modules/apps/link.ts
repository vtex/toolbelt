import * as moment from 'moment'
import {uniqBy, prop} from 'ramda'
import * as debounce from 'debounce'
import * as Bluebird from 'bluebird'
import {createInterface} from 'readline'

import log from '../../logger'
import {apps, colossus} from '../../clients'
import {logAll, onEvent} from '../../sse'
import {manifest} from '../../manifest'
import {changesToString} from '../../apps'
import {toMajorLocator} from '../../locator'
import {id, validateAppAction} from './utils'
import {watch, listLocalFiles, addChangeContent} from '../../file'

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
    200,
  )
  return (changes: Change[]) => {
    if (changes.length === 0) {
      return
    }
    queue = uniqBy(pathProp, queue.concat(changes).reverse())
    return publishPatch(manifest)
  }
})()

const cleanCache = (): Bluebird<void> => {
  return colossus.sendEvent('vtex.toolbelt', '-', 'cleanCache', {
    id: `${manifest.vendor}.${manifest.name}@.${manifest.version}`,
    type: 'clean',
  })
}

const CACHE_CLEAN_AWAIT_MS = 5000

export default {
  description: 'Send the files to the registry and watch for changes',
  options: [
    {
      short: 'c',
      long: 'clean',
      description: 'Clean builder cache',
      type: 'boolean',
    },
  ],
  handler: async (options) => {
    await validateAppAction()
    const unlisten = logAll(log.level, `${manifest.vendor}.${manifest.name}`)

    if (options.c || options.clean) {
      log.info('Requesting to clean cache in builder.')
      cleanCache()
      await Promise.delay(CACHE_CLEAN_AWAIT_MS)
    }

    log.info('Linking app', `${id(manifest)}`)
    const majorLocator = toMajorLocator(manifest.vendor, manifest.name, manifest.version)
    const paths = await listLocalFiles(root)
    const changes = mapFilesToChanges(paths)
    const batch = addChangeContent(changes)

    log.debug('Sending files:')
    paths.forEach(p => log.debug(p))
    log.info(`Sending ${batch.length} file` + (batch.length > 1 ? 's' : ''))
    await link(majorLocator, batch)
    log.info(`${batch.length} file` + (batch.length > 1 ? 's' : '') + ' sent')
    await watch(root, sendChanges)

    createInterface({input: process.stdin, output: process.stdout})
      .on('SIGINT', () => {
        unlisten()
        log.info('Your app is still in development mode.')
        log.info(`You can unlink it with: 'vtex unlink ${majorLocator}'`)
        process.exit()
      })
  },
}
