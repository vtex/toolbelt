import { TemplateRenderer } from '@vtex/toolbelt-message-renderer'
import chalk from 'chalk'
import enquirer from 'enquirer'
import { ToolbeltConfig } from '../../api/clients/IOClients/apps/ToolbeltConfig'
import { ErrorKinds } from '../../api/error/ErrorKinds'
import { ErrorReport } from '../../api/error/ErrorReport'
import { SessionManager } from '../../api/session/SessionManager'
import log from '../../api/logger'
import { promptConfirm } from '../../api/modules/prompts'
import { handleErrorCreatingWorkspace, workspaceCreator } from '../../api/modules/workspace/create'
import welcome from './welcome'

const promptUsePreviousLogin = (account: string, userLogged: string, workspace: string) => {
  const details = `${chalk.green(userLogged)} @ ${chalk.green(account)} / ${chalk.green(workspace)}`
  return promptConfirm(`Do you want to use the previous login details? (${details})`)
}

const promptUsePreviousAccount = (previousAccount: string) => {
  return promptConfirm(`Use previous account? (${chalk.blue(previousAccount)})`)
}

const promptDesiredAccount = async () => {
  // @ts-ignore
  const { account } = await enquirer.prompt({
    type: 'input',
    result: s => s.trim(),
    message: 'Account:',
    name: 'account',
    validate: s => /^\s*[\w-]+\s*$/.test(s) || 'Please enter a valid account.',
  })

  return account
}

const notifyRelease = async () => {
  try {
    const messageRenderer = TemplateRenderer.getSingleton()
    const configClient = ToolbeltConfig.createClient()
    const { messages } = await configClient.getGlobalConfig()
    console.log(messageRenderer.renderNode(messages.releaseNotes))
  } catch (err) {
    ErrorReport.createAndMaybeRegisterOnTelemetry({
      kind: ErrorKinds.TOOLBELT_CONFIG_MESSAGES_ERROR,
      originalError: err,
    }).logErrorForUser({ coreLogLevelDefault: 'debug' })
  }
}

type PostLoginOps = 'welcomeDashboard' | 'releaseNotify' | 'all'

export interface LoginOptions {
  account?: string
  workspace?: string
  allowUseCachedToken?: boolean
  postLoginOps?: PostLoginOps[]
  logAuthUrl?: boolean
}

const getTargetLogin = async ({ account: optionAccount, workspace: optionWorkspace }: LoginOptions) => {
  const {
    account: previousAccount,
    workspace: previousWorkspace,
    userLogged: previousUserLogged,
  } = SessionManager.getSingleton()

  const targetWorkspace = optionWorkspace || 'master'

  if (optionAccount) {
    return { targetAccount: optionAccount, targetWorkspace }
  }

  if (!previousAccount) {
    return { targetAccount: await promptDesiredAccount(), targetWorkspace }
  }

  if (previousWorkspace && !optionWorkspace) {
    if (await promptUsePreviousLogin(previousAccount, previousUserLogged, previousWorkspace)) {
      return { targetAccount: previousAccount, targetWorkspace: previousWorkspace }
    }
  } else if (await promptUsePreviousAccount(previousAccount)) {
    return { targetAccount: previousAccount, targetWorkspace }
  }

  return { targetAccount: await promptDesiredAccount(), targetWorkspace }
}

const shouldShowAnnouncement = (target: PostLoginOps, ops: LoginOptions['postLoginOps']) => {
  if (ops.includes('all') || ops.includes(target)) {
    return true
  }

  return false
}

export default async (opts: LoginOptions) => {
  const { allowUseCachedToken = false, postLoginOps = ['all'], logAuthUrl = false } = opts

  const { targetAccount, targetWorkspace } = await getTargetLogin(opts)
  const sessionManager = SessionManager.getSingleton()
  try {
    await sessionManager.login(targetAccount, {
      targetWorkspace,
      useCachedToken: allowUseCachedToken,
      logAuthUrl,
      workspaceCreation: {
        promptCreation: true,
        creator: workspaceCreator,
        onError: handleErrorCreatingWorkspace,
      },
    })

    log.debug('Login successful', sessionManager.userLogged, targetAccount, sessionManager.token, targetWorkspace)

    log.info(
      `Logged into ${chalk.blue(sessionManager.account)} as ${chalk.green(
        sessionManager.userLogged
      )} at workspace ${chalk.green(sessionManager.workspace)}`
    )

    if (shouldShowAnnouncement('welcomeDashboard', postLoginOps)) {
      await welcome()
    }

    if (shouldShowAnnouncement('releaseNotify', postLoginOps)) {
      await notifyRelease()
    }
  } catch (err) {
    if (err.statusCode === 404) {
      log.error('Account/Workspace not found')
    } else {
      throw err
    }
  }
}
