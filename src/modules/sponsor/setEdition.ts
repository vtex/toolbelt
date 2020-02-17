import chalk from 'chalk'
import R from 'ramda'
import { Sponsor } from '../../clients/sponsor'
import * as conf from '../../conf'
import { CommandError, UserCancelledError } from '../../errors'
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
    throw new UserCancelledError()
  }
  await switchAccount(account, {})
}

export default async (edition: string) => {
  const previousConf = conf.getAll()
  const previousAccount = previousConf.account, previousWorkspace = previousConf.workspace

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

  const sponsorClientForSponsorAccount = new Sponsor(getIOContext(), IOClientOptions)
  await sponsorClientForSponsorAccount.setEdition(previousAccount, previousWorkspace, edition)
  log.info(`Successfully set new edition in account ${chalk.blue(previousAccount)}.`)
  await switchToPreviousAccount(previousConf)
}
