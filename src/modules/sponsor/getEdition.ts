import chalk from 'chalk'
import { Sponsor } from '../../lib/clients/IOClients/apps/Sponsor'
import { SessionManager } from '../../api/session/SessionManager'
import log from '../../logger'

export default async () => {
  const sponsorClient = Sponsor.createClient()
  const data = await sponsorClient.getEdition()
  log.info(
    `Current edition for account ${chalk.blue(SessionManager.getSingleton().account)} is ${chalk.green(data.id)}`
  )
}
