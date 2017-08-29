import * as ora from 'ora'
import {resolve} from 'path'
import * as Bluebird from 'bluebird'
import {LoggerInstance} from 'winston'
import {readFileSync} from 'fs-extra'

import log from '../../logger'
import {createClients} from '../../clients'
import {id, mapFileObject} from './utils'
import {listLocalFiles} from './file'
import {listenBuild} from '../utils'
import {BuildFailError} from '../../errors'

const ARGS_START_INDEX = 2
const root = process.cwd()

const automaticTag = (version: string): string =>
  version.indexOf('-') > 0 ? null : 'latest'

const publisher = (account: string = 'smartcheckout') => {
  const context = {account, workspace: 'master'}

  const prePublish = async (files, tag, unlistenBuild) => {
    const {builder} = createClients(context)
    const response = await builder.prePublishApp(files, tag)
    if (response.status === 200) {
      unlistenBuild(response)
      return
    }

    return response
  }

  const publishApp = (path: string, tag: string, manifest: Manifest): Bluebird<LoggerInstance | never> => {
    const spinner = ora('Publishing app...').start()
    const appId = id(manifest)
    const options = {context, timeout: null}

    return listLocalFiles(path)
      .tap(files => log.debug('Sending files:', '\n' + files.join('\n')))
      .then(files => mapFileObject(files, path))
      .then(files => listenBuild(appId, (unlistenBuild) => prePublish(files, tag, unlistenBuild), options))
      .finally(() => spinner.stop())
      .then(() => log.info(`Published app ${appId} successfully at ${account}`))
      .catch(e => {
        if (e instanceof BuildFailError && e.code === 'already_published') {
          log.error(e.message)
          return Promise.resolve()
        }

        if (e.response && e.response.status === 409) {
          log.error(e.response.data.message.split('The').join(' -'))
          return Promise.resolve()
        }

        throw e
      })
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
  const paths = [path || root, ...options._.slice(ARGS_START_INDEX)].map(arg => arg.toString())
  const {publishApps} = publisher(options.r || options.registry)
  return publishApps(paths, options.tag)
}
