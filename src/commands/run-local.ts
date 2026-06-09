import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../api/oclif/CustomCommand'
import { runLocal } from '../modules/runLocal'

import { ColorifyConstants } from '../api/constants/Colors'

export default class RunLocal extends CustomCommand {
  static description = `Boots a function extension locally from the current directory. Reads ${ColorifyConstants.ID(
    'extension.yaml',
  )}, materializes an ephemeral runner under ~/.vtex/run-local-cache/, and spawns it with hot reload. Warns (but tries anyway) on Node version mismatch with the declared ${ColorifyConstants.ID(
    'runtime:',
  )}.`

  static examples = [
    `${ColorifyConstants.COMMAND_OR_VTEX_REF('vtex run-local')}`,
    `${ColorifyConstants.COMMAND_OR_VTEX_REF('vtex run-local --port 3000')}`,
  ]

  static flags = {
    ...CustomCommand.globalFlags,
    port: oclifFlags.integer({
      char: 'p',
      description: 'Port to bind the runner to.',
      default: 8080,
    }),
  }

  static args = []

  async run() {
    const { flags } = this.parse(RunLocal)
    await runLocal({ port: flags.port })
  }
}
