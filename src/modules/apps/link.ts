import {map} from 'ramda'
import {createInterface} from 'readline'
import log from '../../logger'
import {currentContext} from '../../conf'
import {createClients} from '../../clients'
import {logAll} from '../../sse'
import {getManifest} from '../../manifest'
import {toAppLocator} from '../../locator'
import {pathToFileObject, validateAppAction} from './utils'
import startDebuggerTunnel from './debugger'
import * as chalk from 'chalk'
import {listLocalFiles} from './file'
import {getAccount, getWorkspace} from '../../conf'
import { formatNano } from '../utils'
import legacyLink from './legacyLink'

const root = process.cwd()

export default async (options) => {
  await validateAppAction()
  const manifest = await getManifest()

  if (manifest.builders['service-js'] || manifest.builders['render']) {
    return legacyLink(options)
  }

  const appId = toAppLocator(manifest)
  const unlisten = logAll(currentContext, log.level, `${manifest.vendor}.${manifest.name}`)
  const context = {account: getAccount(), workspace: getWorkspace(), timeout: 60000}
  const {builder} = createClients(context)

  if (options.c || options.clean) {
    log.info('Requesting to clean cache in builder.')
    const {timeNano} = await builder.clean(appId)
    log.info(`Cache cleaned successfully in ${formatNano(timeNano)}`)
  }

  log.info(`Linking app ${appId}`)

  try {
    const paths = await listLocalFiles(root)
    const filesWithContent = map(pathToFileObject(root), paths)

    log.debug('Sending files:')
    paths.forEach(p => log.debug(p))
    log.info(`Sending ${paths.length} file` + (paths.length > 1 ? 's' : ''))

    const {timeNano} = await builder.linkApp(appId, filesWithContent)
    log.info(`Build finished successfully in ${formatNano(timeNano)}`)
  } catch (e) {
    if (e.response) {
      const {message, error} = e.response.data
      log.error(message || error)
      return
    }
  }

  // await watch(root, sendChanges)

  const debuggerPort = await startDebuggerTunnel(manifest)
  log.info(`Debugger tunnel listening on ${chalk.green(`:${debuggerPort}`)}`)

  createInterface({input: process.stdin, output: process.stdout})
    .on('SIGINT', () => {
      unlisten()
      log.info('Your app is still in development mode.')
      log.info(`You can unlink it with: 'vtex unlink ${appId}'`)
      process.exit()
    })
}
