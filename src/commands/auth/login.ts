import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../../utils/CustomCommand'
import { authLogin } from '../../lib/auth/login'

export default class Login extends CustomCommand {
  static description = 'Log into a VTEX account'

  static aliases = ['login']

  static examples = [
    'vtex auth:login',
    'vtex login',
    'vtex login storecomponents',
    'vtex login storecomponents myworkspace',
  ]

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

    await authLogin(account, workspace)
  }
}
