import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../api/oclif/CustomCommand'
import appsPublish from '../modules/apps/publish'

export default class Publish extends CustomCommand {
  static description = 'Publishes the app in the current directory, turning it into a candidate version.'

  static examples = ['vtex publish']

  static flags = {
    ...CustomCommand.globalFlags,
    tag: oclifFlags.string({ char: 't', description: 'Adds the specified tag to the release.' }),
    workspace: oclifFlags.string({ char: 'w', description: 'Uses the specified workspace in the app registry.' }),
    force: oclifFlags.boolean({
      char: 'f',
      description: 'Publishes the app independently of SemVer rules.',
    }),
    yes: oclifFlags.boolean({ char: 'y', description: 'Answers yes to all prompts.' }),
  }

  async run() {
    const {
      args: { path },
      flags: { yes, workspace, force, tag },
    } = this.parse(Publish)

    await appsPublish(path, { yes, workspace, force, tag })
  }
}
