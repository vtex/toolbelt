import { BuildResult } from '@vtex/api'
import * as retry from 'async-retry'
import * as Bluebird from 'bluebird'
import chalk from 'chalk'
import * as inquirer from 'inquirer'
import * as ora from 'ora'
import { isEmpty, map, prop } from 'ramda'
import { createClients } from '../../clients'
import { Environment, forceEnvironment, getAccount, getEnvironment, getToken, getWorkspace } from '../../conf'
import { region } from '../../env'
import { UserCancelledError } from '../../errors'
import { getMostAvailableHost } from '../../host'
import { toAppLocator } from '../../locator'
import log from '../../logger'
import { getManifest } from '../../manifest'
import { logAll } from '../../sse'
import switchAccount from '../auth/switch'
import { listenBuild } from '../build'
import { listLocalFiles } from './file'
import { legacyPublisher } from './legacyPublish'
import { checkBuilderHubMessage, pathToFileObject, showBuilderHubMessage } from './utils'


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


const publisher = (workspace: string = 'master') => {

  const publishApp = async (appRoot: string, appId: string, tag: string, builder): Promise<BuildResult> => {

    const paths = await listLocalFiles(appRoot)
    const retryOpts = {
      retries: 2,
      minTimeout: 1000,
      factor: 2,
    }
    const publish = async (_, tryCount) => {
      const filesWithContent = map(pathToFileObject(appRoot), paths)
      if (tryCount === 1) {
        log.debug('Sending files:', '\n' + paths.join('\n'))
      }
      if (tryCount > 1) {
        log.info(`Retrying...${tryCount-1}`)
      }
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
      try {
        return await builder.publishApp(appId, filesWithContent, publishOptions)
      } catch (err) {
        const response = err.response
        const status = response.status
        const data = response && response.data
        const message = data.message
        const statusMessage = status ? `: Status ${status}` : ''
        log.error(`Error publishing app${statusMessage} (try: ${tryCount})`)
        if (message) {
          log.error(`Message: ${message}`)
        }
        if (status && status < 500) {
          return
        }
        throw err
      }
    }
    return await retry(publish, retryOpts)
  }

  const publishApps = async (path: string, tag: string): Promise<void | never> => {
    const previousAccount = getAccount()
    const previousWorkspace = getWorkspace()

    const manifest = await getManifest()
    const account = getAccount()

    const builderHubMessage = await checkBuilderHubMessage('publish')
    if (!isEmpty(builderHubMessage)) {
      await showBuilderHubMessage(builderHubMessage.message, builderHubMessage.prompt, manifest)
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
        spinner.fail(`Failed to publish ${appId}`)
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
