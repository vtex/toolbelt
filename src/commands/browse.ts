import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../utils/CustomCommand'
import { browse } from '../lib/browse'

export default class Browse extends CustomCommand {
  static description = 'Open endpoint in browser window'

  static examples = ['vtex browse']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
    qr: oclifFlags.boolean({ char: 'q', description: 'Outputs a QR Code on the terminal' }),
  }

  static args = [{ name: 'endpointInput' }]

  async run() {
    const {
      args: { endpointInput },
      flags: { qr },
    } = this.parse(Browse)

    await browse(endpointInput, qr)
  }
}
