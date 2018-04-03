import {readFileSync} from 'fs-extra'
import * as ora from 'ora'
import {resolve} from 'path'
import {forEach, map, prepend} from 'ramda'

import { BuildResult } from '@vtex/api'
import {createClients} from '../../clients'
import {getAccount, Region} from '../../conf'
import {toAppLocator} from '../../locator'
import log from '../../logger'
import {logAll} from '../../sse'
import {listenBuild} from '../build'
import {listLocalFiles} from './file'
import {legacyPublisher} from './legacyPublish'
import {parseArgs, pathToFileObject} from './utils'

const root = process.cwd()

const automaticTag = (version: string): string =>
  version.indexOf('-') > 0 ? null : 'latest'

const publisher = (account: string, workspace: string = 'master', staging: boolean = false, legacyPublishApp) => {
  const region = staging ? Region.Staging : Region.Production
  const context = {account, workspace, region, timeout: 60000}
  const {builder} = createClients(context)

  const publishApp = async (appRoot: string, appId: string, tag: string): Promise<BuildResult> => {
    const paths = await listLocalFiles(appRoot)
    const filesWithContent = map(pathToFileObject(appRoot), paths)
    log.debug('Sending files:', '\n' + paths.join('\n'))
    return await builder.publishApp(appId, filesWithContent, tag)
  }

  const publishApps = async (paths: string[], tag: string): Promise<void | never> => {
    forEach(async (p : string) => {
      const path = resolve(p)
      const manifest = JSON.parse(readFileSync(resolve(path, 'manifest.json'), 'utf8'))
      const pubTag = tag || automaticTag(manifest.version)

      if (manifest.builders.render
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
    }, paths)
    Promise.resolve()
  }

  return {publishApp, publishApps}
}

export default (path: string, options) => {
  log.debug('Starting to publish app')
  const paths = prepend(path || root, parseArgs(options._))
  const registry = options.r || options.registry
  const workspace = options.w || options.workspace
  const optionPublic = options.p || options.public
  const staging = !! options.staging
  const account = optionPublic ? 'smartcheckout' : registry ? registry : getAccount()
  const {legacyPublishApp} = legacyPublisher(account, workspace)
  const {publishApps} = publisher(account, workspace, staging, legacyPublishApp)
  return publishApps(paths, options.tag)
}
