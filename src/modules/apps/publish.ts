import axios from 'axios'
import * as Bluebird from 'bluebird'
import * as ora from 'ora'
import { map, prop } from 'ramda'

import { BuildResult } from '@vtex/api'
import chalk from 'chalk'
import * as inquirer from 'inquirer'
import { createClients } from '../../clients'
import { Environment, forceEnvironment, getAccount, getEnvironment, getToken, getWorkspace } from '../../conf'
import { region } from '../../env'
import { CommandError, UserCancelledError } from '../../errors'
import { getMostAvailableHost } from '../../host'
import { toAppLocator } from '../../locator'
import log from '../../logger'
import { getManifest } from '../../manifest'
import { logAll } from '../../sse'
import switchAccount from '../auth/switch'
import { listenBuild } from '../build'
import { listLocalFiles } from './file'
import { legacyPublisher } from './legacyPublish'
import { pathToFileObject } from './utils'


const root = process.cwd()
const AVAILABILITY_TIMEOUT = 1000
const N_HOSTS = 5

const getSwitchAccountMessage = (previousAccount: string, currentAccount = getAccount()) :string => {
  return `Now you are logged in ${chalk.blue(currentAccount)}. Do you want to return to ${chalk.blue(previousAccount)} account?`
}

const switchToPreviousAccount = async (previousAccount: string, previousWorkspace: string) => {
  if (previousAccount !== getAccount()) {
    const canSwitchToPrevious = await promptPublishOnVendor(getSwitchAccountMessage(previousAccount))
    if (canSwitchToPrevious) {
      return await switchAccount(previousAccount, {workspace: previousWorkspace})
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

const promptConfirmPublishing = (msg: string): Bluebird<string> =>
  inquirer.prompt({
    message: msg,
    name: 'appName',
    type: 'input',
  })
    .then<string>(prop('appName'))

const publisher = (workspace: string = 'master') => {

  const publishApp = async (appRoot: string, appId: string, tag: string, builder): Promise<BuildResult> => {
    const stickyHint = await getMostAvailableHost(
      appId,
      builder,
      N_HOSTS,
      AVAILABILITY_TIMEOUT
    )
    const publishOptions = {
      sticky: true,
      stickyHint,
      tag,
    }

    const paths = await listLocalFiles(appRoot)
    const filesWithContent = map(pathToFileObject(appRoot), paths)
    log.debug('Sending files:', '\n' + paths.join('\n'))
    try {
      return await builder.publishApp(appId, filesWithContent, publishOptions)
    } catch (e) {
      const data = e.response && e.response.data
      if (data && data.code && data.code === 'build_in_progress') {
        log.warn(`Build for ${appId} is already in progress`)
      }
      throw e
    }
  }

  const checkActiveToggle = async (): Promise<any> => {
    const http = axios.create({
      baseURL: `https://vtex.myvtex.com`,
      timeout: 10000,
    })
    try {
      const res = await http.get('/_v/private/builder/0/toggle')
      return res.data
    } catch (e) {
      return {'isActive': false}
    }
  }

  const publishApps = async (path: string, tag: string): Promise<void | never> => {
    const previousAccount = getAccount()
    const previousWorkspace = getWorkspace()

    const manifest = await getManifest()
    const account = getAccount()

    const activeToggle = await checkActiveToggle()
    if (activeToggle.isActive) {
      const confirmPublishingMsg = `Are you absolutely sure? ${activeToggle.message ? activeToggle.message : ''}\nPlease type in the name of the app to confirm (ex: vtex.getting-started):`
      const appNameInput = await promptConfirmPublishing(confirmPublishingMsg)
      const appToBePublished = `${manifest.vendor}.${manifest.name}`
      if (appNameInput !== appToBePublished) {
        throw new CommandError(`${appToBePublished} doesn't match with the app name.`)
      }
    }

    if (manifest.vendor !== account) {
      const switchToVendorMsg = `You are trying to publish this app in an account that differs from the indicated vendor. Do you want to publish in account ${chalk.blue(manifest.vendor)}?`
      const canSwitchToVendor = await promptPublishOnVendor(switchToVendorMsg)
      if (!canSwitchToVendor) {
        throw new UserCancelledError()
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
        await switchToPreviousAccount(previousAccount, previousWorkspace)
        throw e
      }
    }
    await switchToPreviousAccount(previousAccount, previousWorkspace)

    Promise.resolve()
  }

  return { publishApp, publishApps }
}

export default (path: string, options) => {
  if (!options.staging) {
    forceEnvironment(Environment.Production)
  }

  log.debug(`Starting to publish app in ${getEnvironment()}`)

  path = path || root
  const workspace = options.w || options.workspace
  const { publishApps } = publisher(workspace)
  return publishApps(path, options.tag)
}
