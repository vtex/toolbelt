import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../../utils/CustomCommand'
import { appsPublish } from '../../lib/apps/publish'

export default class Publish extends CustomCommand {
  static description = 'Publish the current app or a path containing an app'

  static examples = ['vtex apps:publish', 'vtex publish']

  static aliases = ['publish']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
    tag: oclifFlags.string({ char: 't', description: 'Apply a tag to the release' }),
    workspace: oclifFlags.string({ char: 'w', description: 'Specify the workspace for the app registry' }),
    force: oclifFlags.boolean({
      char: 'f',
      description: 'Publish app without checking if the semver is being respected',
    }),
    yes: oclifFlags.boolean({ char: 'y', description: 'Answer yes to confirmation prompts' }),
  }

  async run() {
    const {
      args: { path },
      flags: { yes, workspace, force, tag },
    } = this.parse(Publish)

    await appsPublish(path, yes, workspace, force, tag)
  }
}
