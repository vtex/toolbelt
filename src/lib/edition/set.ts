import chalk from 'chalk'
import R from 'ramda'

import { Sponsor } from '../../clients/sponsor'
import * as conf from '../../utils/conf'
import { CommandError, UserCancelledError } from '../../utils/errors'
import log from '../../utils/logger'
import { switchAccount } from '../switch'
import { promptConfirm } from '../../utils/prompts'
import { getIOContext, IOClientOptions, promptWorkspaceMaster, switchToPreviousAccount } from '../../utils/utils'

const promptSwitchToAccount = async (account: string, initial: boolean) => {
  const reason = initial
    ? `Initial edition can only be set by ${chalk.blue(account)} account`
    : `Only current account sponsor (${chalk.blue(account)}) can change its edition`
  const proceed = await promptConfirm(`${reason}. Do you want to switch to account ${chalk.blue(account)}?`)
  if (!proceed) {
    throw new UserCancelledError()
  }
  await switchAccount(account, {})
}

export async function editionSet(edition: string) {
  const previousConf = conf.getAll()
  const previousAccount = previousConf.account
  const previousWorkspace = previousConf.workspace

  const workspaceNotice = previousWorkspace === 'master' ? '' : ` in workspace ${chalk.blue(previousWorkspace)}`
  log.info(`Changing edition of account ${chalk.blue(previousAccount)}${workspaceNotice}.`)

  const sponsorClient = new Sponsor(getIOContext(), IOClientOptions)
  const data = await sponsorClient.getSponsorAccount()
  const sponsorAccount = R.prop('sponsorAccount', data)

  if (!sponsorAccount) {
    if (previousWorkspace !== 'master') {
      throw new CommandError('Can only set initial edition in master workspace')
    }
    await promptSwitchToAccount('vtex', true)
  } else {
    if (previousWorkspace === 'master') {
      await promptWorkspaceMaster(previousAccount)
    }
    await promptSwitchToAccount(sponsorAccount, false)
  }

  try {
    const sponsorClientForSponsorAccount = new Sponsor(getIOContext(), IOClientOptions)
    await sponsorClientForSponsorAccount.setEdition(previousAccount, previousWorkspace, edition)

    log.info(`Successfully changed edition${workspaceNotice} of account ${chalk.blue(previousAccount)}.`)
  } catch (ex) {
    log.error(`Failed to change edition of account ${chalk.blue(previousAccount)}.`)
    throw ex
  } finally {
    await switchToPreviousAccount(previousConf)
  }
}
