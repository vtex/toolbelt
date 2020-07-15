import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../api/oclif/CustomCommand'
import authLogin from '../modules/auth/login'

export default class Login extends CustomCommand {
  static description = 'Log into a VTEX account'

  static examples = ['vtex login', 'vtex login storecomponents']

  static flags = {
    ...CustomCommand.globalFlags,
    workspace: oclifFlags.string({ char: 'w', description: 'Workspace to login into' }),
  }

  static args = [{ name: 'account', required: false }]

  async run() {
    const {
      args: { account },
      flags: { workspace },
    } = this.parse(Login)

    await authLogin({ account, workspace })
  }
}
