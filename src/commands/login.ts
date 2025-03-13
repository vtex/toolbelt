import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../api/oclif/CustomCommand'
import authLogin from '../modules/auth/login'

import { ColorifyConstants } from '../api/constants/Colors'
import loginWithPipeline from '../modules/auth/pipeline'

export default class Login extends CustomCommand {
  static description = `Logs in to a ${ColorifyConstants.ID('VTEX account')}.`

  static examples = [
    `${ColorifyConstants.COMMAND_OR_VTEX_REF('vtex login')}`,
    `${ColorifyConstants.COMMAND_OR_VTEX_REF('vtex login')} storecomponents`,
  ]

  static flags = {
    ...CustomCommand.globalFlags,
    pipeline: oclifFlags.boolean({
      char: 'p',
      description: `Runs the command in ${ColorifyConstants.ID('pipeline')} mode.`,
    }),
    workspace: oclifFlags.string({
      char: 'w',
      description: `Logs in the specified ${ColorifyConstants.ID('workspace')}.`,
    }),
    vtexApiKey: oclifFlags.string({
      char: 'k',
      description: `VTEX API Key.`,
    }),
    vtexApiToken: oclifFlags.string({
      char: 't',
      description: `VTEX API`
    })
  }

  static args = [
    { name: 'account', required: false, description: `${ColorifyConstants.ID('Account')} name to log in.` },
  ]

  async run() {
    const {
      args: { account },
      flags: { workspace, pipeline, vtexApiKey, vtexApiToken },
    } = this.parse(Login)

    if(!pipeline) {
      await authLogin({ account, workspace })
    }else{
      await loginWithPipeline({ account, workspace }, vtexApiKey, vtexApiToken)
    }
  }
}
