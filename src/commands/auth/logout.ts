import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../../lib/CustomCommand'
import { SessionManager } from '../../lib/session/SessionManager'
import log from '../../logger'

export default class Logout extends CustomCommand {
  static description = 'Logout of the current VTEX account'

  static aliases = ['logout']

  static examples = ['vtex auth:logout', 'vtex logout']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
  }

  static args = []

  async run() {
    log.debug('Clearing config file')
    const sessionManager = SessionManager.getSessionManager()
    sessionManager.logout()
    log.info('See you soon!')
  }
}
