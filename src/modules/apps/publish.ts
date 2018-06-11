import * as Bluebird from 'bluebird'
import { readFileSync } from 'fs-extra'
import * as ora from 'ora'
import { resolve } from 'path'
import { forEach, map, prepend, prop } from 'ramda'

import { BuildResult } from '@vtex/api'
import chalk from 'chalk'
import * as inquirer from 'inquirer'
import { createClients } from '../../clients'
import { Environment, forceEnvironment, getAccount, getEnvironment, getToken } from '../../conf'
import { region } from '../../env'
import { toAppLocator } from '../../locator'
import log from '../../logger'
import { logAll } from '../../sse'
import switchAccount from '../auth/switch'
import { listenBuild } from '../build'
import { listLocalFiles } from './file'
import { legacyPublisher } from './legacyPublish'
import { parseArgs, pathToFileObject } from './utils'


const root = process.cwd()

const getSwitchAccountMessage = (previousAccount: string, currentAccount = getAccount()) :string => {
  return `Now you are not logged in ${chalk.blue(currentAccount)}. Wanna return to ${chalk.blue(previousAccount)} account?`
}

const switchToPreviousAccount = async (previousAccount: string) => {
  if (previousAccount != getAccount()) {
    const canSwitchToPrevious = await promptPublishOnVendor(getSwitchAccountMessage(previousAccount))
    if (canSwitchToPrevious) {
      return await switchAccount(previousAccount, {})
    }
  }
}

const automaticTag = (version: string): string =>
  version.indexOf('-') > 0 ? null : 'latest'

const promptPublishOnVendor = (msg: string): Bluebird<boolean> =>
  inquirer.prompt({
    message: msg,
    name: 'confirm',
    type: 'confirm',
  })
    .then<boolean>(prop('confirm'))

const publisher = (workspace: string = 'master') => {

  const publishApp = async (appRoot: string, appId: string, tag: string, builder): Promise<BuildResult> => {
    const paths = await listLocalFiles(appRoot)
    const filesWithContent = map(pathToFileObject(appRoot), paths)
    log.debug('Sending files:', '\n' + paths.join('\n'))
    return await builder.publishApp(appId, filesWithContent, tag)
  }

  const publishApps = async (paths: string[], tag: string): Promise<void | never> => {
    const previousAccount = getAccount()
    forEach(async (p: string) => {
      const path = resolve(p)
      const manifest = JSON.parse(readFileSync(resolve(path, 'manifest.json'), 'utf8'))
      const account = getAccount()

      if (manifest.vendor !== account) {
        const switchToVendorMsg = `You are not logged in the vendor account for publishing the app. Wanna do that now going to ${chalk.blue(manifest.vendor)} account?`
        const canSwitchToVendor = await promptPublishOnVendor(switchToVendorMsg)
        if (!canSwitchToVendor) {
          return
        }
        await switchAccount(manifest.vendor, {})
      }

     const context = { account: manifest.vendor, workspace, region: region(), authToken: getToken() }
     const { builder } = createClients(context, { timeout: 60000 })

      const pubTag = tag || automaticTag(manifest.version)

      if (manifest.builders.render
        || manifest.builders['functions-ts']) {
        const unlisten = logAll({ account, workspace }, log.level, `${manifest.vendor}.${manifest.name}`)
        const { legacyPublishApp } = legacyPublisher(manifest.vendor, workspace)
        await legacyPublishApp(path, pubTag, manifest).finally(unlisten)
      } else {
        const appId = toAppLocator(manifest)
        const oraMessage = ora(`Publishing ${appId} ...`)
        const spinner = log.level === 'debug' ? oraMessage.info() : oraMessage.start()
        try {
          const { response } = await listenBuild(appId, () => publishApp(path, appId, pubTag, builder), { waitCompletion: true, context })
          if (response.code !== 'build.accepted') {
            spinner.warn(`${appId} was published successfully, but you should update your builder hub to the latest version.`)
          } else {
             spinner.succeed(`${appId} was published successfully!`)
          }
        } catch (e) {
          spinner.fail(`Fail to publish ${appId}`)
          log.error(e.message)
          await switchToPreviousAccount(previousAccount)
          throw e
        }
      }
      await switchToPreviousAccount(previousAccount)
    }, paths)
    
    Promise.resolve()
  }

  return { publishApp, publishApps }
}

export default (path: string, options) => {
  if (!options.staging) {
    forceEnvironment(Environment.Production)
  }

  log.debug(`Starting to publish app in ${getEnvironment()}`)

  const paths = prepend(path || root, parseArgs(options._))
  const workspace = options.w || options.workspace
  const { publishApps } = publisher(workspace)
  return publishApps(paths, options.tag)
}
