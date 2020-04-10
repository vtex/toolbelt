import chalk from 'chalk'

import { Sponsor } from '../../clients/sponsor'
import { getAccount } from '../../utils/conf'
import log from '../../utils/logger'
import { getIOContext, IOClientOptions } from '../../utils/utils'

export async function editionGet() {
  const sponsorClient = new Sponsor(getIOContext(), IOClientOptions)
  const data = await sponsorClient.getEdition()
  log.info(`Current edition for account ${chalk.blue(getAccount())} is ${chalk.green(data.id)}`)
}
