import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../api/oclif/CustomCommand'
import appsPublish from '../modules/apps/publish'

import { ColorifyConstants } from '../api/constants/Colors'

export default class Publish extends CustomCommand {
  static description = 'Publishes the app in the current directory as a release candidate version.'

  static examples = [`${ColorifyConstants.COMMAND_OR_VTEX_REF('vtex publish')}`]

  static flags = {
    ...CustomCommand.globalFlags,
    tag: oclifFlags.string({ char: 't', description: 'Adds the specified tag to the release.' }),
    workspace: oclifFlags.string({
      char: 'w',
      description: `Uses the specified ${ColorifyConstants.ID('workspace')} in the app registry.`,
    }),
    pipeline: oclifFlags.boolean({
      char: 'p',
      description: `Runs the command in ${ColorifyConstants.ID('pipeline')} mode.`,
    }),
    force: oclifFlags.boolean({
      char: 'f',
      description: 'Publishes the app independently of SemVer rules.',
    }),
    yes: oclifFlags.boolean({ char: 'y', description: 'Answers yes to all prompts.' }),
  }

  async run() {
    const {
      args: { path },
      flags: { yes, workspace, force, tag, pipeline },
    } = this.parse(Publish)

    await appsPublish(path, { yes, workspace, force, tag }, pipeline)
  }
}
