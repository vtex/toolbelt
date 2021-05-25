import jwt from 'jsonwebtoken'
import axios from 'axios'
import chalk from 'chalk'
import enquirer from 'enquirer'
import moment from 'moment'
import { compose, concat, contains, curry, head, last, prop, propSatisfies, reduce, split, tail, __ } from 'ramda'
import semverDiff from 'semver-diff'
import { createAppsClient } from '../clients/IOClients/infra/Apps'
import { createRegistryClient } from '../clients/IOClients/infra/Registry'
import { createWorkspacesClient } from '../clients/IOClients/infra/Workspaces'
import { getLastLinkReactDate, getNumberOfReactLinks, saveLastLinkReactDate, saveNumberOfReactLinks } from '../conf'
import { createFlowIssueError } from '../error/utils'
import log from '../logger'
import { ManifestEditor } from '../manifest'
import { SessionManager } from '../session/SessionManager'
import { promptConfirm } from './prompts'

const workspaceExampleName = process.env.USER || 'example'

const workspaceMasterAllowedOperations = ['install', 'uninstall']

// It is not allowed to link apps in a production workspace.
const workspaceProductionAllowedOperatios = ['install', 'uninstall']

const builderHubMessagesLinkTimeout = 2000 // 2 seconds
const builderHubMessagesPublishTimeout = 10000 // 10 seconds

export const sleepSec = (sec: number) => new Promise(resolve => setTimeout(resolve, sec * 1000))

export const workspaceMasterMessage = `This action is ${chalk.red('not allowed')} in workspace ${chalk.green(
  'master'
)}, please use another workspace.
You can run "${chalk.blue(`vtex use ${workspaceExampleName} -r`)}" to use a workspace named "${chalk.green(
  workspaceExampleName
)}"`

export const workspaceProductionMessage = workspace =>
  `This action is ${chalk.red('not allowed')} in workspace ${chalk.green(
    workspace
  )} because it is a production workspace. You can create a ${chalk.yellowBright('dev')} workspace called ${chalk.green(
    workspaceExampleName
  )} by running ${chalk.blue(`vtex use ${workspaceExampleName} -r`)}`

export const promptWorkspaceMaster = async account => {
  const confirm = await promptConfirm(
    `Are you sure you want to force this operation on the ${chalk.green(
      'master'
    )} workspace on the account ${chalk.blue(account)}?`,
    false
  )
  if (!confirm) {
    return false
  }
  log.warn(`Using ${chalk.green('master')} workspace. I hope you know what you're doing. 💥`)
  return true
}

export const validateAppAction = async (operation: string, app?): Promise<boolean> => {
  const { account, workspace } = SessionManager.getSingleton()

  if (workspace === 'master') {
    if (!contains(operation, workspaceMasterAllowedOperations)) {
      throw createFlowIssueError(workspaceMasterMessage)
    } else {
      const confirm = await promptWorkspaceMaster(account)
      if (!confirm) {
        return false
      }
    }
  }

  const workspaces = createWorkspacesClient()
  const workspaceMeta = await workspaces.get(account, workspace)
  if (workspaceMeta.production && !contains(operation, workspaceProductionAllowedOperatios)) {
    throw createFlowIssueError(workspaceProductionMessage(workspace))
  }

  // No app arguments and no manifest file.
  const isReadable = await ManifestEditor.isManifestReadable()
  if (!app && !isReadable) {
    throw createFlowIssueError(
      `No app was found, please fix your manifest.json${app ? ' or use <vendor>.<name>[@<version>]' : ''}`
    )
  }
  return true
}

export const wildVersionByMajor = compose<string, string[], string, string>(concat(__, '.x'), head, split('.'))

export const extractVersionFromId = compose<string, string[], string>(last, split('@'))

export const pickLatestVersion = (versions: string[]): string => {
  const start = head(versions)
  return reduce(
    (acc: string, version: string) => {
      return semverDiff(acc, version) ? version : acc
    },
    start,
    tail(versions)
  )
}

export const handleError = curry((app: string, err: any) => {
  if (err.response && err.response.status === 404) {
    return Promise.reject(createFlowIssueError(`App ${chalk.green(app)} not found`))
  }
  return Promise.reject(err)
})

export const appLatestVersion = (app: string, version = 'x'): Promise<string | never> => {
  return createRegistryClient()
    .getAppManifest(app, version)
    .then<string>(prop('id'))
    .then<string>(extractVersionFromId)
    .catch(handleError(app))
}

export const appLatestMajor = (app: string): Promise<string | never> => {
  return appLatestVersion(app).then<string>(wildVersionByMajor)
}

export const appIdFromRegistry = (app: string, majorLocator: string) => {
  return createRegistryClient()
    .getAppManifest(app, majorLocator)
    .then<string>(prop('id'))
    .catch(handleError(app))
}

export const getVendorFromApp = (app: string) => {
  const [vendor] = app.split('.')
  return vendor
}

export async function checkBuilderHubMessage(cliRoute: string): Promise<any> {
  const http = axios.create({
    baseURL: `https://vtex.myvtex.com`,
    timeout: cliRoute === 'link' ? builderHubMessagesLinkTimeout : builderHubMessagesPublishTimeout,
  })
  try {
    const res = await http.get(`/_v/private/builder/0/getmessage/${cliRoute}`)
    return res.data
  } catch (e) {
    return {}
  }
}

const promptConfirmName = (msg: string): Promise<string> =>
  enquirer
    .prompt({
      message: msg,
      name: 'appName',
      type: 'input',
    })
    .then<string>(prop('appName'))

export async function showBuilderHubMessage(message: string, showPrompt: boolean, manifest: ManifestEditor) {
  if (message) {
    if (showPrompt) {
      const confirmMsg = `Are you absolutely sure?\n${message ||
        ''}\nPlease type in the name of the app to confirm (ex: vtex.getting-started):`
      const appNameInput = await promptConfirmName(confirmMsg)
      const AppName = `${manifest.vendor}.${manifest.name}`
      if (appNameInput !== AppName) {
        throw createFlowIssueError(`${appNameInput} doesn't match with the app name.`)
      }
    } else {
      log.info(message)
    }
  }
}

export const resolveAppId = (appName: string, appVersion: string): Promise<string> => {
  const apps = createAppsClient()
  return apps.getApp(`${appName}@${appVersion}`).then(prop('id'))
}

export const isLinked = propSatisfies<string, Manifest>(contains('+build'), 'version')

const REACT_BUILDER = 'react'
const EMAIL_KEY = 'sub'
const I_VTEX_ACCOUNT = '@vtex.com'
const BR_VTEX_ACCOUNT = '@vtex.com.br'

export const continueAfterReactTermsAndConditions = async (manifest: ManifestEditor): Promise<boolean> => {
  const session = SessionManager.getSingleton()
  const { token } = session
  const decodedToken = jwt.decode(token)
  const userEmail = decodedToken?.[EMAIL_KEY] as string
  if (userEmail && (userEmail.endsWith(I_VTEX_ACCOUNT) || userEmail.endsWith(BR_VTEX_ACCOUNT))) {
    return true
  }

  if (!Object.keys(manifest.builders).includes(REACT_BUILDER)) {
    return true
  }

  const count = getNumberOfReactLinks()
  if (count && count > 1) {
    return true
  }
  saveNumberOfReactLinks(count + 1)

  const now = moment()
  const lastShowDateString = getLastLinkReactDate()
  if (lastShowDateString) {
    const lastShowDate = moment(lastShowDateString)
    console.log('lastShow', lastShowDate.toISOString())
    const elapsedTime = moment.duration(now.diff(lastShowDate))
    if (elapsedTime.asHours() < 24 && now.day() === lastShowDate.day()) {
      return true
    }
  }

  log.warn(
    `${chalk.bold(
      `⚠️  Caution: VTEX does not grant support for custom storefront projects.`
    )} From this point onwards, you agree to take full responsibility for the component’s development and maintenance.`
  )

  const confirm = await promptConfirm(`Do you want to continue?`, false)

  if (confirm) {
    saveLastLinkReactDate(now.toISOString())
  }
  return confirm
}
