import * as ora from 'ora'
import {resolve} from 'path'
import {readFileSync} from 'fs-extra'
import {prepend, map} from 'ramda'

import log from '../../logger'
import {createClients} from '../../clients'
import {toAppLocator} from '../../locator'
import {pathToFileObject, parseArgs} from './utils'
import {listLocalFiles} from './file'
import {getAccount} from '../../conf'
import {logAll} from '../../sse'
import {listenBuild} from '../build'
import {legacyPublisher} from './legacyPublish'
import { BuildResult } from '@vtex/api'

const root = process.cwd()

const automaticTag = (version: string): string =>
  version.indexOf('-') > 0 ? null : 'latest'

const publisher = (account: string, workspace: string = 'master', legacyPublishApp) => {
  const context = {account, workspace, timeout: 60000}
  const {builder} = createClients(context)

  const publishApp = async (appRoot: string, appId: string, tag: string): Promise<BuildResult> => {
    const paths = await listLocalFiles(appRoot)
    const filesWithContent = map(pathToFileObject(appRoot), paths)
    log.debug('Sending files:', '\n' + paths.join('\n'))
    return await builder.publishApp(appId, filesWithContent, tag)
  }

  const publishApps = async (paths: string[], tag: string, accessor = 0): Promise<void | never> => {
    const path = resolve(paths[accessor])
    const manifest = JSON.parse(readFileSync(resolve(path, 'manifest.json'), 'utf8'))
    const pubTag = tag || automaticTag(manifest.version)
    const next = () => accessor < paths.length - 1
      ? publishApps(paths, tag, accessor + 1)
      : Promise.resolve()

    if (manifest.builders['render']
      || manifest.builders['functions-ts']) {
      const unlisten = logAll({account, workspace}, log.level, `${manifest.vendor}.${manifest.name}`)
      await legacyPublishApp(path, pubTag, manifest).finally(unlisten)
    } else {
      const appId = toAppLocator(manifest)
      const oraMessage = ora(`Publishing ${appId} ...`)
      const spinner = log.level === 'debug' ? oraMessage.info() : oraMessage.start()
      try {
        const {response} = await listenBuild(appId, () => publishApp(path, appId, pubTag), {waitCompletion: true, context})
        if (response.code !== 'build.accepted') {
          spinner.warn(`${appId} was published successfully, but you should update your builder hub to the latest version.`)
        } else {
          spinner.succeed(`${appId} was published successfully!`)
        }
      } catch (e) {
        spinner.fail(`Fail to publish ${appId}`)
        log.error(e.message)
        throw e
      }
    }

    await next()
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
