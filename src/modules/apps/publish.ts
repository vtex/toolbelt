import * as ora from 'ora'
import {resolve} from 'path'
import * as Bluebird from 'bluebird'
import {readFileSync} from 'fs-extra'
import {prepend, map} from 'ramda'

import log from '../../logger'
import {createClients} from '../../clients'
import {toAppLocator} from '../../locator'
import {pathToFileObject, parseArgs} from './utils'
import {listLocalFiles} from './file'
import {getAccount} from '../../conf'
import {formatNano} from '../utils'
import {legacyPublisher} from './legacyPublish'

const root = process.cwd()

const automaticTag = (version: string): string =>
  version.indexOf('-') > 0 ? null : 'latest'

const publisher = (account: string, workspace: string = 'master', legacyPublishApp) => {
  const context = {account, workspace, timeout: 60000}
  const {builder} = createClients(context)

  const publishApp = async (appRoot: string, tag: string, manifest: Manifest): Promise<void> => {
    const spinner = ora('Publishing app...').start()
    const appId = toAppLocator(manifest)
    let time

    try {
      const paths = await listLocalFiles(appRoot)
      const filesWithContent = map(pathToFileObject(appRoot), paths)
      log.debug('Sending files:', '\n' + paths.join('\n'))
      const {timeNano} = await builder.publishApp(appId, filesWithContent, tag)
      time = timeNano
    } catch (e) {
      if (e.response) {
        const {message, error} = e.response.data
        log.error(message || error)
        return
      }
      throw e
    } finally {
      spinner.stop()
    }

    log.info(`Build finished successfully in ${formatNano(time)}`)
    log.info(`Published app ${appId} at ${account}`)
  }

  const publishApps = (paths: string[], tag: string, accessor = 0): Bluebird<void | never> => {
    const path = resolve(paths[accessor])
    const manifest = JSON.parse(readFileSync(resolve(path, 'manifest.json'), 'utf8'))
    const next = () => accessor < paths.length - 1
      ? publishApps(paths, tag, accessor + 1)
      : Promise.resolve()

    if (manifest.builders['render']
      || manifest.builders['functions-ts']
      || manifest.name === 'builder-hub') {
      return legacyPublishApp(path, tag || automaticTag(manifest.version), manifest).then(next)
    }
    return publishApp(path, tag || automaticTag(manifest.version), manifest).then(next)
  }

  return {publishApp, publishApps}
}

export default (path: string, options) => {
  log.debug('Starting to publish app')
  const paths = prepend(path || root, parseArgs(options._))
  const registry = options.r || options.registry
  const workspace = options.w || options.workspace
  const optionPublic = options.p || options.public
  const account = optionPublic ? 'smartcheckout' : registry ? registry : getAccount()
  const {legacyPublishApp} = legacyPublisher(account, workspace)
  const {publishApps} = publisher(account, workspace, legacyPublishApp)
  return publishApps(paths, options.tag)
}
