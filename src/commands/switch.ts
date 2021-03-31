import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../api/oclif/CustomCommand'
import { switchAccount } from '../api/modules/auth/switch'

import { ColorifyConstants } from '../api/constants/Colors'

export default class Switch extends CustomCommand {
  static description = `Switches to another ${ColorifyConstants.ID('VTEX account.')}`

  static examples = [`${ColorifyConstants.COMMAND_OR_VTEX_REF('vtex switch')} storecomponents`]

  static flags = {
    ...CustomCommand.globalFlags,
    workspace: oclifFlags.string({
      char: 'w',
      description: `Moves to the specified ${ColorifyConstants.ID('workspace.')}`,
    }),
  }

  static args = [{ name: 'account', required: true, description: `${ColorifyConstants.ID('Account')} name to log in.` }]

  async run() {
    const {
      args: { account },
      flags: { workspace },
    } = this.parse(Switch)

    await switchAccount(account, { workspace, showWelcomeMessage: true })
  }
}
