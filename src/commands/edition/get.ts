import { flags } from '@oclif/command'
import chalk from 'chalk'

import { Sponsor } from '../../clients/sponsor'
import { getAccount } from '../../conf'
import { CustomCommand } from '../../lib/CustomCommand'
import log from '../../logger'
import { getIOContext, IOClientOptions } from '../../lib/utils'

export default class EditionGet extends CustomCommand {
  static description = 'Get edition of the current account'

  static examples = []

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  static args = []

  async run() {
    this.parse(EditionGet)
    const sponsorClient = new Sponsor(getIOContext(), IOClientOptions)
    const data = await sponsorClient.getEdition()
    log.info(`Current edition for account ${chalk.blue(getAccount())} is ${chalk.green(data.id)}`)
  }
}
