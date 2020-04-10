import { flags as oclifFlags } from '@oclif/command'

import { workspaceDelete } from '../../lib/workspace/delete'
import { CustomCommand } from '../../utils/CustomCommand'

export default class WorkspaceDelete extends CustomCommand {
  static description = 'Delete one or many workspaces'

  static examples = ['vtex workspace:delete workspaceName', 'vtex workspace:delete workspaceName1 workspaceName2']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
    force: oclifFlags.string({ char: 'f', description: "Ignore if you're currently using the workspace" }),
    yes: oclifFlags.boolean({ char: 'y', description: 'Answer yes to confirmation prompts' }),
  }

  static args = [
    { name: 'workspace1', required: true },
    { name: 'ithWorkspace', required: false, multiple: true },
  ]

  async run() {
    const { raw, flags: { force, yes } } = this.parse(WorkspaceDelete)
    const names = this.getAllArgs(raw)

    await workspaceDelete(names, yes, force)
  }
}
