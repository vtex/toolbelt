import { flags as oclifFlags } from '@oclif/command'
import { CustomCommand } from '../api/oclif/CustomCommand'
import browse from '../modules/browse'

import { ColorifyConstants } from '../api/constants/Colors'

export default class Browse extends CustomCommand {
  static description = `Opens the URL relative to your current ${ColorifyConstants.ID('workspace')} and ${ColorifyConstants.ID('account')} in a new browser window.`

  static examples = [`${ColorifyConstants.COMMAND_OR_VTEX_REF('vtex browse')}`, `${ColorifyConstants.COMMAND_OR_VTEX_REF('vtex browse')} admin`]

  static flags = {
    ...CustomCommand.globalFlags,
    qr: oclifFlags.boolean({ char: 'q', description: 'Prints a QR Code on the terminal.' }),
  }

  static args = [{ name: 'path', default: '', description: `Relative path from ${ColorifyConstants.ID('https://{workspace}--{account}.myvtex.com/.')}` }]

  async run() {
    const {
      args: { path },
      flags: { qr },
    } = this.parse(Browse)

    await browse(path, { qr })
  }
}
