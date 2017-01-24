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
import {startSpinner, setSpinnerText, stopSpinner} from '../../spinner'
import {
  id,
  appEngineClient,
  workspaceMasterMessage,
} from './utils'

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
    async (account, workspace, data) => {
      timeStart()

      const locator = toMajorLocator(data.vendor, data.name, data.version)

      try {
        log.info(`Sending ${queue.length} change` + (queue.length > 1 ? 's' : ''))
        await appEngineClient().link(account, workspace, locator, queue)

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
    return publishPatch(getAccount(), getWorkspace(), manifest)
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
    log.info('Linking app', `${id}`)
    console.log(
      chalk.green('Your URL:'),
      chalk.blue(getWorkspaceURL(account, workspace))
    )

    const majorLocator = toMajorLocator(manifest.vendor, manifest.name, manifest.version)
    const paths = await listLocalFiles(root)
    log.debug('Sending files:', '\n' + paths.join('\n'))
    const changes = addChangeContent(mapFilesToChanges(paths))

    setSpinnerText(`Sending ${changes.length} file` + (changes.length > 1 ? 's' : ''))
    startSpinner()
    await appEngineClient().link(
      account,
      workspace,
      majorLocator,
      changes,
    )
    stopSpinner()

    courier.log(account, workspace, log.level)

    await watch(root, sendChanges)
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
