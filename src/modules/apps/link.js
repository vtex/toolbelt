import chalk from 'chalk'
import moment from 'moment'
import {toMajorLocator} from '../../locator'
import log from '../../logger'
import debounce from 'debounce'
import {Promise} from 'bluebird'
import {uniqBy, prop} from 'ramda'
import courier from '../../courier'
import {manifest} from '../../manifest'
import {createInterface} from 'readline'
import {allocateChangeLog} from '../../apps'
import {timeStart, timeStop} from '../../time'
import {getWorkspaceURL} from '../../workspace'
import {watch, listLocalFiles, addChangeContent} from '../../file'
import {getWorkspace, getAccount} from '../../conf'
import {
  id,
  workspaceMasterMessage,
} from './utils'
import {apps} from '../../clients'
const {link} = apps

const root = process.cwd()

const pathProp = prop('path')

const mapFilesToChanges = (files) => {
  const changes = files.map(path => ({path, action: 'save'}))
  changes.unshift({ path: '*', action: 'remove'})
  return changes
}

const sendChanges = (() => {
  let queue = []
  const publishPatch = debounce(
    async (data) => {
      timeStart()

      const locator = toMajorLocator(data.vendor, data.name, data.version)

      try {
        log.info(`Sending ${queue.length} change` + (queue.length > 1 ? 's' : ''))
        await link(locator, queue)

        allocateChangeLog(queue, moment().format('HH:mm:ss'))
        queue = []
      } catch (err) {
        timeStop()
        throw err
      }
    },
    200
  )
  return changes => {
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
    const workspace = getWorkspace()
    if (workspace === 'master') {
      log.error(workspaceMasterMessage)
      return Promise.resolve()
    }

    const account = getAccount()
    log.info('Linking app', `${id(manifest)}`)
    courier.log(account, workspace, log.level)
    const majorLocator = toMajorLocator(manifest.vendor, manifest.name, manifest.version)
    const paths = await listLocalFiles(root)
    log.debug('Sending files:')
    paths.forEach(p => log.debug(p))
    const changes = addChangeContent(mapFilesToChanges(paths))

    log.info(`Sending ${changes.length} file` + (changes.length > 1 ? 's' : ''))

    await link(majorLocator, changes)

    await watch(root, sendChanges)

    log.info(chalk.green('Success! Your app is ready at:'))
    log.info(chalk.yellow(getWorkspaceURL(account, workspace)))

    createInterface({
      input: process.stdin,
      output: process.stdout,
    }).on('SIGINT', () => {
      log.info('Your app is still in development mode.')
      log.info(`You can unlink it with: 'vtex unlink ${majorLocator}'`)
      process.exit()
    })
  },
}
