import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../api/oclif/CustomCommand'
import browse from '../modules/browse'

export default class Browse extends CustomCommand {
  static description = 'Open endpoint in browser window'

  static examples = ['vtex browse', 'vtex browse admin']

  static flags = {
    ...CustomCommand.globalFlags,
    qr: oclifFlags.boolean({ char: 'q', description: 'Outputs a QR Code on the terminal' }),
  }

  static args = [{ name: 'path' }]

  async run() {
    const {
      args: { path },
      flags: { qr },
    } = this.parse(Browse)

    await browse(path, { qr })
  }
}
