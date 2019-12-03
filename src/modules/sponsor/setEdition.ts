import chalk from 'chalk'
import * as R from 'ramda'
import { Sponsor } from '../../clients/sponsor'
import * as conf from '../../conf'
import { UserCancelledError } from '../../errors'
import log from '../../logger'
import { default as switchAccount } from '../auth/switch'
import { promptConfirm } from '../prompts'
import { switchToPreviousAccount } from '../utils'
import { getIOContext, IOClientOptions } from '../utils'

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
  const previousAccount = previousConf.account
  const sponsorClient = new Sponsor(getIOContext(), IOClientOptions)
  const data = await sponsorClient.getSponsorAccount()
  const sponsorAccount = R.prop('sponsorAccount', data)
  if (!sponsorAccount) {
    await promptSwitchToAccount('vtex', true)
  } else if (previousAccount !== sponsorAccount) {
    await promptSwitchToAccount(sponsorAccount, false)
  }
  const sponsorClientForSponsorAccount = new Sponsor(getIOContext(), IOClientOptions)
  await sponsorClientForSponsorAccount.setEdition(previousAccount, edition)
  log.info(`Successfully set new edition in account ${chalk.blue(previousAccount)}.`)
  await switchToPreviousAccount(previousConf)
}
