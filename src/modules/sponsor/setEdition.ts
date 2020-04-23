import chalk from 'chalk'
import { Sponsor } from '../../clients/sponsor'
import * as conf from '../../conf'
import { CommandError } from '../../errors'
import log from '../../logger'
import { promptWorkspaceMaster } from '../apps/utils'
import { default as switchAccount } from '../auth/switch'
import { promptConfirm } from '../prompts'
import { switchToPreviousAccount, getIOContext, IOClientOptions } from '../utils'

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

export default async (edition: string) => {
  const previousConf = conf.getAll()
  const targetAccount = previousConf.account
  const targetWorkspace = previousConf.workspace

  const workspaceNotice = targetWorkspace === 'master' ? '' : ` in workspace ${chalk.blue(targetWorkspace)}`
  log.info(`Changing edition of account ${chalk.blue(targetAccount)}${workspaceNotice}.`)

  const sponsorClient = new Sponsor(getIOContext(), IOClientOptions)
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
    const sponsorClientForSponsorAccount = new Sponsor(getIOContext(), IOClientOptions)
    await sponsorClientForSponsorAccount.setEdition(targetAccount, targetWorkspace, edition)

    log.info(`Successfully changed edition${workspaceNotice} of account ${chalk.blue(targetAccount)}.`)
  } catch (ex) {
    log.error(`Failed to change edition of account ${chalk.blue(targetAccount)}.`)
    throw ex
  } finally {
    await switchToPreviousAccount(previousConf)
  }
}
