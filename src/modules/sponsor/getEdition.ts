import chalk from 'chalk'
import { createIOContext } from '../../lib/clients'
import { Sponsor } from '../../lib/clients/Sponsor'
import { SessionManager } from '../../lib/session/SessionManager'
import log from '../../logger'
import { IOClientOptions } from '../utils'

export default async () => {
  const sponsorClient = new Sponsor(createIOContext(), IOClientOptions)
  const data = await sponsorClient.getEdition()
  log.info(
    `Current edition for account ${chalk.blue(SessionManager.getSingleton().account)} is ${chalk.green(data.id)}`
  )
}
