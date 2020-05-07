import chalk from 'chalk'
import { Sponsor } from '../../lib/clients/Sponsor'
import { SessionManager } from '../../lib/session/SessionManager'
import log from '../../logger'

export default async () => {
  const sponsorClient = Sponsor.createClient()
  const data = await sponsorClient.getEdition()
  log.info(
    `Current edition for account ${chalk.blue(SessionManager.getSingleton().account)} is ${chalk.green(data.id)}`
  )
}
