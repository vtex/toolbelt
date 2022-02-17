import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../api/oclif/CustomCommand'
import authLogin from '../modules/auth/login'

import { ColorifyConstants } from '../api/constants/Colors'

export default class Login extends CustomCommand {
  static description = `Logs in to a ${ColorifyConstants.ID('VTEX account')}.`

  static examples = [
    `${ColorifyConstants.COMMAND_OR_VTEX_REF('vtex login')}`,
    `${ColorifyConstants.COMMAND_OR_VTEX_REF('vtex login')} storecomponents`,
  ]

  static flags = {
    ...CustomCommand.globalFlags,
    workspace: oclifFlags.string({
      char: 'w',
      description: `Logs in the specified ${ColorifyConstants.ID('workspace')}.`,
    }),
    logAuthUrl: oclifFlags.string({
      char: 'a',
      description: `Don't open browser and prints auth url.`,
    }),
  }

  static args = [
    { name: 'account', required: false, description: `${ColorifyConstants.ID('Account')} name to log in.` },
  ]

  async run() {
    const {
      args: { account },
      flags: { workspace, logAuthUrl },
    } = this.parse(Login)

    await authLogin({ account, workspace, logAuthUrl })
  }
}
