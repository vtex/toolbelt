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
  id,
  publishApp,
  installApp,
  appsClient,
  mapFileObject,
  registryClient,
  workspaceMasterMessage,
} from './utils'

const root = process.cwd()

const KEEP_ALIVE_INTERVAL = 5000

const pathProp = prop('path')

const sendChanges = (() => {
  let queue = []
  const publishPatch = debounce(
    (account, workspace, vendor, name, version) => {
      setSpinnerText('Sending changes')
      startSpinner()
      timeStart()
      return registryClient().publishAppPatch(
        account,
        workspace,
        vendor,
        name,
        version,
        queue
      )
      .then(() => installApp(`${vendor}.${name}@${version.replace(/(-.*)?$/, '-dev')}`))
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
    return publishPatch(getAccount(), getWorkspace(), manifest.vendor, manifest.name, manifest.version)
  }
})()

const keepAppAlive = () => {
  let exitPromise
  const devApp = `${manifest.vendor}.${manifest.name}@${manifest.version.replace(/(-.*)?$/, '-dev')}`
  return installApp(devApp)
  .then(() => {
    const keepAliveInterval = setInterval(() => {
      appsClient().updateAppTtl(
        getAccount(),
        getWorkspace(),
        id,
      ).catch(e => {
        log.error(`Error on keep alive request, will try again in ${KEEP_ALIVE_INTERVAL / 1000}s`)
        log.debug(e)
        if (e.response) {
          log.debug(e.response.data)
        }
      })
    }, KEEP_ALIVE_INTERVAL)
    createInterface({
      input: process.stdin,
      output: process.stdout,
    }).on('SIGINT', () => {
      if (exitPromise) {
        return
      }
      stopSpinner()
      clearTimeout(keepAliveInterval)
      log.info('Exiting...')
      exitPromise = appsClient().uninstallApp(getAccount(), getWorkspace(), devApp)
      .finally(() => process.exit())
    })
  })
}

export default {
  description: 'Send the files to the registry and watch for changes',
  handler: () => {
    const workspace = getWorkspace()
    if (workspace === 'master') {
      log.error(workspaceMasterMessage)
      return Promise.resolve()
    }

    const account = getAccount()
    log.info('Watching app', `${id}`)
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
    .then(files => publishApp(files, true))
    .then(keepAppAlive)
    .tap(() => log.debug('Starting watch...'))
    .then(() => watch(root, sendChanges))
    .catch(err => {
      stopSpinner()
      return Promise.reject(err)
    })
  },
}
