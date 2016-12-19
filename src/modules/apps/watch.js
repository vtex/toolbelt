import chalk from 'chalk'
import moment from 'moment'
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
import {watch, listLocalFiles} from '../../file'
import {getWorkspace, getAccount, getToken} from '../../conf'
import {startSpinner, setSpinnerText, stopSpinner} from '../../spinner'
import {
  publishApp,
  installApp,
  mapFileObject,
  workspaceMasterMessage,
} from './utils'
import {appRegistry} from '../../clients'

const root = process.cwd()

const pathProp = prop('path')

const version = `dev.${getWorkspace()}`

const id = `${manifest.vendor}.${manifest.name}@${version}`

const sendChanges = (() => {
  let queue = []
  const publishPatch = debounce(
    () => {
      setSpinnerText('Sending changes')
      startSpinner()
      timeStart()
      return appRegistry().publishAppPatch(
        getAccount(),
        manifest.vendor,
        manifest.name,
        version,
        queue
      )
      .then(() => installApp(id))
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
    return publishPatch()
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
    log.info('Watching app', id)
    console.log(
      chalk.green('Your URL:'),
      chalk.blue(getWorkspaceURL(account, workspace))
    )
    courier.listen(account, workspace, getToken())
    if (log.level === 'info') {
      setSpinnerText('Sending files')
    }
    startSpinner()

    return listLocalFiles(root)
    .tap(files => log.debug('Sending files:', '\n' + files.join('\n')))
    .then(mapFileObject)
    .then(files => publishApp(files, version))
    .then(() =>
      installApp(id)
    )
    .tap(() => log.debug('Starting watch...'))
    .then(() => watch(root, sendChanges))
    .then(() => {
      createInterface({
        input: process.stdin,
        output: process.stdout,
      }).on('SIGINT', () => {
        stopSpinner()
        log.info('Your app is still in development mode.')
        log.info('You can uninstall it with:')
        log.info(`vtex uninstall ${manifest.vendor}.${manifest.name}`)
        process.exit()
      })
    })
    .catch(err => {
      stopSpinner()
      return Promise.reject(err)
    })
  },
}
