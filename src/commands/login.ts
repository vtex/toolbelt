import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../oclif/CustomCommand'
import authLogin from '../modules/auth/login'

export default class Login extends CustomCommand {
  static description = 'Log into a VTEX account'

  static examples = ['vtex login', 'vtex login storecomponents', 'vtex login storecomponents myworkspace']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
  }

  static args = [
    { name: 'account', required: false },
    { name: 'workspace', required: false },
  ]

  async run() {
    const {
      args: { account, workspace },
    } = this.parse(Login)

    await authLogin({ account, workspace })
  }
}
