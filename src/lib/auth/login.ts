import chalk from 'chalk'
import enquirer from 'enquirer'
import { prop } from 'ramda'
import boxen from 'boxen'
import emojic from 'emojic'

import * as conf from '../../utils/conf'
import log from '../../utils/logger'
import { promptConfirm } from '../../utils/prompts'
import { SessionManager } from '../../utils/session/SessionManager'

const [cachedAccount, cachedLogin, cachedWorkspace] = [conf.getAccount(), conf.getLogin(), conf.getWorkspace()]
const details =
  cachedAccount && `${chalk.green(cachedLogin)} @ ${chalk.green(cachedAccount)} / ${chalk.green(cachedWorkspace)}`

const promptUsePrevious = () => promptConfirm(`Do you want to use the previous login details? (${details})`)

const promptAccount = async promptPreviousAcc => {
  if (promptPreviousAcc) {
    const confirm = await promptConfirm(`Use previous account? (${chalk.blue(cachedAccount)})`)
    if (confirm) {
      return cachedAccount
    }
  }

  const account = prop(
    'account',
    await enquirer.prompt({
      type: 'input',
      result: s => s.trim(),
      message: 'Account:',
      name: 'account',
      validate: s => /^\s*[\w-]+\s*$/.test(s) || 'Please enter a valid account.',
    })
  )
  return account
}

const notifyRelease = () => {
  const RELEASE_NOTES_DATE = 'February 2020'
  const RELEASE_NOTES_URL = 'https://bit.ly/2IQ2rSP'

  const msg = [
    'Are you up-to-date with the VTEX IO latest news?',
    `${emojic.memo} Don’t forget to check out our ${chalk.bold.green(`${RELEASE_NOTES_DATE} Release Notes:`)}`,
    `${chalk.blueBright(RELEASE_NOTES_URL)}`,
  ].join('\n')

  const boxOptions: boxen.Options = {
    padding: 1,
    margin: 1,
    borderStyle: boxen.BorderStyle.Round,
    borderColor: 'yellow',
    align: 'center',
  }

  console.log(boxen(msg, boxOptions))
}

export async function authLogin(optionAccount: string, optionWorkspace: string) {
  const usePrevious = !(optionAccount || optionWorkspace) && details && (await promptUsePrevious())
  const account =
    optionAccount ||
    (usePrevious && cachedAccount) ||
    ((await promptAccount(cachedAccount && optionWorkspace)) as string)
  const workspace = optionWorkspace || (usePrevious && cachedWorkspace) || 'master'

  const sessionManager = SessionManager.getSessionManager()
  try {
    await sessionManager.login(account, { targetWorkspace: workspace, useCachedToken: false })
    log.debug('Login successful', sessionManager.userLogged, account, sessionManager.token, workspace)
    log.info(
      `Logged into ${chalk.blue(account)} as ${chalk.green(sessionManager.userLogged)} at workspace ${chalk.green(
        workspace
      )}`
    )
    notifyRelease()
  } catch (err) {
    if (err.statusCode === 404) {
      log.error('Account/Workspace not found')
    } else {
      throw err
    }
  }
}
