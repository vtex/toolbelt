import * as moment from 'moment'
import {uniqBy, prop} from 'ramda'
import * as debounce from 'debounce'
import {createInterface} from 'readline'

import log from '../../logger'
import {apps} from '../../clients'
import {listen} from '../../courier'
import { manifest, isManifestReadable } from '../../manifest'
import {changesToString} from '../../apps'
import {toMajorLocator} from '../../locator'
import {id, workspaceMasterMessage} from './utils'
import {getWorkspace, getAccount} from '../../conf'
import {watch, listLocalFiles, addChangeContent} from '../../file'

const {link} = apps
const root = process.cwd()
const pathProp = prop('path')
const [account, workspace] = [getAccount(), getWorkspace()]
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
  handler: () => {
    if (workspace === 'master') {
      log.error(workspaceMasterMessage)
      return Promise.resolve()
    }

    if (!isManifestReadable()) {
      const err = new Error()
      err.name = 'InterruptionError'
      log.error('No app was found, please fix the manifest.json to update the registry.')
      throw err
    }

    log.info('Linking app', `${id(manifest)}`)
    listen(account, workspace, log.level, `${manifest.vendor}.${manifest.name}@${manifest.version}`)
    const majorLocator = toMajorLocator(manifest.vendor, manifest.name, manifest.version)
    return listLocalFiles(root)
      .tap(() => log.debug('Sending files:'))
      .tap((paths: string[]) => paths.forEach(p => log.debug(p)))
      .then(mapFilesToChanges)
      .then(addChangeContent)
      .tap((batch: Batch[]) =>
        log.info(`Sending ${batch.length} file` + (batch.length > 1 ? 's' : '')),
      )
      .tap((batch: Batch[]) => link(majorLocator, batch))
      .tap((batch: Batch[]) =>
        log.info(`${batch.length} file` + (batch.length > 1 ? 's' : '') + ' sent'),
      )
      .then(() => watch(root, sendChanges))
      .then(() =>
        createInterface({input: process.stdin, output: process.stdout})
          .on('SIGINT', () => {
            log.info('Your app is still in development mode.')
            log.info(`You can unlink it with: 'vtex unlink ${majorLocator}'`)
            process.exit()
          }),
      )
  },
}
