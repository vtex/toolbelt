import { flags } from '@oclif/command'

import * as conf from '../../conf'
import { clusterIdDomainInfix, publicEndpoint } from '../../env'
import { CustomCommand } from '../../lib/CustomCommand'

export default class URL extends CustomCommand {
  static description = 'Prints base URL for current account, workspace and environment'

  static aliases = ['url']

  static examples = ['vtex auth:url', 'vtex url']

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  async run() {
    this.parse(URL)
    const { account, workspace } = conf.currentContext
    console.log(`https://${workspace}--${account}${clusterIdDomainInfix()}.${publicEndpoint()}`)
  }
}
