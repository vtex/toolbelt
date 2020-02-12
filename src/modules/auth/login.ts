import chalk from 'chalk'
import enquirer from 'enquirer'
import { prop } from 'ramda'
import * as conf from '../../conf'
import { SessionManager } from '../../lib/session/SessionManager'
import log from '../../logger'
import { promptConfirm } from '../prompts'
import boxen from 'boxen'
import emojic from 'emojic'

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
  const msg = [
    `Are you up-to-date with the VTEX IO lastest news?`,
    `${emojic.memo} Don’t forget to check out our ${chalk.bold.green(`January 2020 Release Notes:`)}`,
    `${chalk.blueBright(`https://bit.ly/37iCFjy`)}`,
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

export default async options => {
  const defaultArgumentAccount = options && options._ && options._[0]
  const optionAccount = options ? options.a || options.account || defaultArgumentAccount : null
  const optionWorkspace = options ? options.w || options.workspace : null
  const usePrevious = !(optionAccount || optionWorkspace) && details && (await promptUsePrevious())
  const account =
    optionAccount || (usePrevious && cachedAccount) || (await promptAccount(cachedAccount && optionWorkspace))
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
