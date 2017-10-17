import * as ora from 'ora'
import {resolve} from 'path'
import * as Bluebird from 'bluebird'
import {readFileSync} from 'fs-extra'
import {prepend, map} from 'ramda'

import log from '../../logger'
import {createClients} from '../../clients'
import {id, pathToFileObject, parseArgs} from './utils'
import {listLocalFiles} from './file'
import {listenBuild} from '../utils'
import {BuildFailError} from '../../errors'
import {getAccount} from '../../conf'

const root = process.cwd()

const automaticTag = (version: string): string =>
  version.indexOf('-') > 0 ? null : 'latest'

const publisher = (account: string, workspace: string = 'master') => {
  const context = {account, workspace}

  const prePublish = async (files, tag, unlistenBuild) => {
    const {builder} = createClients(context)
    const response = await builder.prePublishApp(files, tag)
    if (response.status === 200) {
      unlistenBuild(response)
      return
    }

    return response
  }

  const publishApp = async (appRoot: string, tag: string, manifest: Manifest): Promise<void> => {
    const spinner = ora('Publishing app...').start()
    const appId = id(manifest)
    const options = {context, timeout: null}

    try {
      const paths = await listLocalFiles(appRoot)
      const filesWithContent = map(pathToFileObject(appRoot), paths)
      log.debug('Sending files:', '\n' + paths.join('\n'))
      await listenBuild(appId, (unlistenBuild) => prePublish(filesWithContent, tag, unlistenBuild), options)
    } catch (e) {
      if (e instanceof BuildFailError) {
        log.error(e.message)
        return
      }
      if (e.response && e.response.status >= 400 && e.response.status < 500) {
        log.error(e.response.data.message)
        return
      }
      throw e
    } finally {
      spinner.stop()
    }
    log.info(`Published app ${appId} successfully at ${account}`)
  }

  const publishApps = (paths: string[], tag: string, accessor = 0): Bluebird<void | never> => {
    const path = resolve(paths[accessor])
    const manifest = JSON.parse(readFileSync(resolve(path, 'manifest.json'), 'utf8'))
    const next = () => accessor < paths.length - 1
      ? publishApps(paths, tag, accessor + 1)
      : Promise.resolve()
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
  const {publishApps} = publisher(account, workspace)
  return publishApps(paths, options.tag)
}
