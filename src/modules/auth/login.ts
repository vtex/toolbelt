import { TemplateRenderer } from '@vtex/toolbelt-message-renderer'
import chalk from 'chalk'
import enquirer from 'enquirer'
import { ToolbeltConfig } from '../../lib/clients/IOClients/apps/ToolbeltConfig'
import { ErrorKinds } from '../../lib/error/ErrorKinds'
import { ErrorReport } from '../../lib/error/ErrorReport'
import { SessionManager } from '../../lib/session/SessionManager'
import log from '../../logger'
import { promptConfirm } from '../prompts'
import welcome from './welcome'

const promptUsePreviousLogin = (account: string, userLogged: string, workspace: string) => {
  const details = `${chalk.green(userLogged)} @ ${chalk.green(account)} / ${chalk.green(workspace)}`
  return promptConfirm(`Do you want to use the previous login details? (${details})`)
}

const promptUsePreviousAccount = (previousAccount: string) => {
  return promptConfirm(`Use previous account? (${chalk.blue(previousAccount)})`)
}

const promptDesiredAccount = async () => {
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
    ErrorReport.createAndRegisterOnTelemetry({
      kind: ErrorKinds.TOOLBELT_CONFIG_MESSAGES_ERROR,
      originalError: err,
    }).logErrorForUser({ coreLogLevelDefault: 'debug' })
  }
}

interface LoginOptions {
  account?: string
  workspace?: string
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

export default async (opts: LoginOptions) => {
  const { targetAccount, targetWorkspace } = await getTargetLogin(opts)
  const sessionManager = SessionManager.getSingleton()
  try {
    await sessionManager.login(targetAccount, { targetWorkspace, useCachedToken: false })
    log.debug('Login successful', sessionManager.userLogged, targetAccount, sessionManager.token, targetWorkspace)
    log.info(
      `Logged into ${chalk.blue(targetAccount)} as ${chalk.green(sessionManager.userLogged)} at workspace ${chalk.green(
        targetWorkspace
      )}`
    )

    await welcome()
    await notifyRelease()
  } catch (err) {
    if (err.statusCode === 404) {
      log.error('Account/Workspace not found')
    } else {
      throw err
    }
  }
}
