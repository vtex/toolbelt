import chalk from 'chalk'
import { Sponsor } from '../../clients/sponsor'
import { getAccount } from '../../conf'
import log from '../../logger'
import { getIOContext, options } from './utils'

export default async () => {
  const sponsorClient = new Sponsor(getIOContext(), options)
  const data = await sponsorClient.getEdition()
  log.info(`Current edition for account ${chalk.blue(getAccount())} is ${chalk.green(data.id)}`)
}
