import { Sponsor } from '../../clients/sponsor'
import * as conf from '../../conf'
import { UserCancelledError } from '../../errors'
import log from '../../logger'
import { default as switchAccount } from '../auth/switch'
import { promptConfirm } from '../prompts'
import { switchToPreviousAccount } from '../utils'
import { getIOContext, options } from './utils'

const promptChangeToSponsorAccount = async (sponsorAccount: string) => {
  const proceed = await promptConfirm(
    `Do you wish to log into the sponsor account ${sponsorAccount}?`
  )
  if (!proceed) {
    throw new UserCancelledError()
  }
  await switchAccount(sponsorAccount, {})
}

export default async (edition: string) => {
  const previousConf = conf.getAll()
  const previousAccount = conf.getAccount()
  const sponsorClient = new Sponsor(getIOContext(), options)
  let sponsorAccount = ''
  try {
  sponsorAccount = await sponsorClient.getSponsorAccount()
  console.log(sponsorAccount)
  } catch (e) {
    console.log(e.response)
    throw e
  }
  if (previousAccount !== sponsorAccount) {
    await promptChangeToSponsorAccount(sponsorAccount)
  }
  const sponsorClientForSponsorAccount = new Sponsor(getIOContext(), options)
  await sponsorClientForSponsorAccount.setEdition(previousAccount, edition)
  log.info(`Successfully set new edition in account ${previousAccount}. You stil need to wait for the house keeper to update this account.`)
  await switchToPreviousAccount(previousConf)
}
