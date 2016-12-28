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
import {watch, listLocalFiles, createChanges} from '../../file'
import {getWorkspace, getAccount, getToken} from '../../conf'
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
  changes.push({ path: '*', action: 'remove'})
  return changes
}

const sendChanges = (() => {
  let queue = []
  const publishPatch = debounce(
    (account, workspace, data) => {
      setSpinnerText('Sending changes')
      startSpinner()
      timeStart()

      const locator = toMajorLocator(data.vendor, data.name, data.version)

      console.log(queue)
      return appEngineClient().link(account, workspace, locator, queue)
      .then(() => allocateChangeLog(queue, moment().format('HH:mm:ss')))
      .then(() => { queue = [] })
      .catch(err => {
        timeStop()
        stopSpinner()
        throw err
      })
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
  handler: () => {
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
    courier.listen(account, workspace, getToken())
    if (log.level === 'info') {
      setSpinnerText('Sending files')
    }
    startSpinner()

    const majorLocator = toMajorLocator(manifest.vendor, manifest.name, manifest.version)
    return listLocalFiles(root)
    .tap(files => log.debug('Sending files:', '\n' + files.join('\n')))
    .then(mapFilesToChanges)
    .then(createChanges)
    .then((changes) => appEngineClient().link(
      account,
      workspace,
      majorLocator,
      changes,
    ))
    .tap(() => log.debug('Starting link...'))
    .then(() => watch(root, sendChanges))
    .then(() => {
      createInterface({
        input: process.stdin,
        output: process.stdout,
      }).on('SIGINT', () => {
        stopSpinner()
        log.info('Your app is still in development mode.')
        log.info(`You can unlink it with: 'vtex unlink ${majorLocator}'`)
        process.exit()
      })
    })
    .catch(err => {
      stopSpinner()
      return Promise.reject(err)
    })
  },
}
