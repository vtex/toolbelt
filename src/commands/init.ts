import { flags as oclifFlags } from '@oclif/command'
import { CustomCommand } from '../api/oclif/CustomCommand'
import appsInit from '../modules/init'

import { ColorifyConstants } from '../api/constants/Colors'

export default class Init extends CustomCommand {
  static description = `Copies starting files and folders from ${ColorifyConstants.ID(
    'VTEX'
  )} boilerplates into your local directories.`

  static examples = [
    `${ColorifyConstants.COMMAND_OR_VTEX_REF('vtex init')}`,
    `${ColorifyConstants.COMMAND_OR_VTEX_REF('vtex init project-name')}`,
    `${ColorifyConstants.COMMAND_OR_VTEX_REF('vtex init --list')}`,
    `${ColorifyConstants.COMMAND_OR_VTEX_REF('vtex init project-name --template service-example -y')}`,
  ]

  static flags = {
    ...CustomCommand.globalFlags,
    template: oclifFlags.string({
      description: `Name of the ${ColorifyConstants.ID(
        'template'
      )} to clone directly, skipping the interactive selector. Must match one of the templates available to you (see ${ColorifyConstants.COMMAND_OR_VTEX_REF(
        '--list'
      )}).`,
    }),
    list: oclifFlags.boolean({
      char: 'l',
      description: `Lists the ${ColorifyConstants.ID('templates')} available to you and exits, without cloning.`,
    }),
    yes: oclifFlags.boolean({
      char: 'y',
      description: `Skips the confirmation prompt before creating the destination folder.`,
    }),
  }

  static args = [{ name: 'projectName', required: false }]

  async run() {
    const {
      args: { projectName },
      flags: { template, list, yes },
    } = this.parse(Init)

    await appsInit(projectName, { template, list, yes })
  }
}
