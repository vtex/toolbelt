import chalk from 'chalk'
import { CommandError } from '../../api/error/errors'
import { Sponsor } from '../../api/clients/IOClients/apps/Sponsor'
import { SessionManager } from '../../api/session/SessionManager'
import log from '../../api/logger'
import { promptWorkspaceMaster } from '../../api/modules/utils'
import { returnToPreviousAccount, switchAccount } from '../../api/modules/auth/switch'
import { promptConfirm } from '../../api/modules/prompts'

const promptSwitchToAccount = async (account: string, initial: boolean) => {
  const reason = initial
    ? `Initial edition can only be set by ${chalk.blue(account)} account`
    : `Only current account sponsor (${chalk.blue(account)}) can change its edition`
  const proceed = await promptConfirm(`${reason}. Do you want to switch to account ${chalk.blue(account)}?`)
  if (!proceed) {
    return
  }
  await switchAccount(account, {})
}

export default async function setEdition(edition: string, workspace?: string, autoSwitchBack = false) {
  const session = SessionManager.getSingleton()
  const { account: previousAccount, workspace: previousWorkspace } = session

  const targetAccount = session.account
  const targetWorkspace = workspace ?? session.workspace

  const workspaceNotice = targetWorkspace === 'master' ? '' : ` in workspace ${chalk.blue(targetWorkspace)}`
  log.info(`Changing edition of account ${chalk.blue(targetAccount)}${workspaceNotice}.`)

  const sponsorClient = Sponsor.createClient()
  const sponsorAccount = await sponsorClient.getSponsorAccount()

  if (!sponsorAccount) {
    if (targetWorkspace !== 'master') {
      throw new CommandError('Can only set initial edition in master workspace')
    }
    await promptSwitchToAccount('vtex', true)
  } else {
    if (targetWorkspace === 'master') {
      await promptWorkspaceMaster(targetWorkspace)
    }
    await promptSwitchToAccount(sponsorAccount, false)
  }

  try {
    const sponsorClientForSponsorAccount = Sponsor.createClient()
    await sponsorClientForSponsorAccount.setEdition(targetAccount, targetWorkspace, edition)

    log.info(`Successfully changed edition${workspaceNotice} of account ${chalk.blue(targetAccount)}.`)
  } catch (ex) {
    log.error(`Failed to change edition of account ${chalk.blue(targetAccount)}.`)
    throw ex
  } finally {
    if (autoSwitchBack) {
      await returnToPreviousAccount({ previousAccount, previousWorkspace, promptConfirmation: false })
    } else {
      await returnToPreviousAccount({ previousAccount, previousWorkspace })
    }
  }
}
