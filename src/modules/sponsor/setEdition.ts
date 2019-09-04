import chalk from 'chalk'
import R from 'ramda'
import { Sponsor } from '../../clients/sponsor'
import * as conf from '../../conf'
import { UserCancelledError } from '../../errors'
import log from '../../logger'
import { default as switchAccount } from '../auth/switch'
import { promptConfirm } from '../prompts'
import { switchToPreviousAccount } from '../utils'
import { getIOContext, IOClientOptions } from '../utils'

const promptChangeToSponsorAccount = async (sponsorAccount: string) => {
  const proceed = await promptConfirm(`Do you wish to log into the sponsor account ${sponsorAccount}?`)
  if (!proceed) {
    throw new UserCancelledError()
  }
  await switchAccount(sponsorAccount, {})
}

export default async (edition: string) => {
  const previousConf = conf.getAll()
  const previousAccount = previousConf.account
  const sponsorClient = new Sponsor(getIOContext(), IOClientOptions)
  const data = await sponsorClient.getSponsorAccount()
  const sponsorAccount = R.prop('sponsorAccount', data)
  if (!sponsorAccount) {
    throw new Error(`No sponsor account found for account ${chalk.blue(previousAccount)}`)
  }
  if (previousAccount !== sponsorAccount) {
    await promptChangeToSponsorAccount(sponsorAccount)
  }
  const sponsorClientForSponsorAccount = new Sponsor(getIOContext(), IOClientOptions)
  await sponsorClientForSponsorAccount.setEdition(previousAccount, edition)
  log.info(
    `Successfully set new edition in account ${chalk.blue(
      previousAccount
    )}. You stil need to wait for the house keeper to update this account.`
  )
  await switchToPreviousAccount(previousConf)
}
