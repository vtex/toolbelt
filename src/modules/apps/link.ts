import * as moment from 'moment'
import {uniqBy, prop} from 'ramda'
import * as debounce from 'debounce'
import {createInterface} from 'readline'

import {CommandError} from '../../errors'
import log from '../../logger'
import {apps} from '../../clients'
import {logAll} from '../../courier'
import {manifest, isManifestReadable } from '../../manifest'
import {changesToString} from '../../apps'
import {toMajorLocator} from '../../locator'
import {id, workspaceMasterMessage} from './utils'
import {getWorkspace} from '../../conf'
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

export default {
  description: 'Send the files to the registry and watch for changes',
  handler: async () => {
    if (getWorkspace() === 'master') {
      throw new CommandError(workspaceMasterMessage)
    }

    if (!isManifestReadable()) {
      throw new CommandError('No app was found. Do you have a valid manifest.json?')
    }

    log.info('Linking app', `${id(manifest)}`)
    const unlisten = logAll(log.level, `${manifest.vendor}.${manifest.name}`)
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
