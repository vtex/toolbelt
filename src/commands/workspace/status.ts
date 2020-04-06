import { flags } from '@oclif/command'
import chalk from 'chalk'

import { workspaces } from '../../clients'
import { getAccount, getWorkspace } from '../../conf'
import { CustomCommand } from '../../lib/CustomCommand'
import log from '../../logger'

const workspaceState = (meta: WorkspaceResponse) => (meta.production ? 'production' : 'dev')

export default class WorkspaceStatus extends CustomCommand {
  static description = 'Display information about a workspace'

  static examples = []

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  static args = [{ name: 'workspaceName', required: false }]

  async run() {
    const { args } = this.parse(WorkspaceStatus)

    const account = getAccount()
    const workspace = args.workspaceName || getWorkspace()

    const meta = await workspaces.get(account, workspace)

    log.info(
      `Workspace ${chalk.green(workspace)} in account ${chalk.blue(account)} is a ${chalk.yellowBright(
        workspaceState(meta)
      )} workspace with weight ${chalk.yellowBright(`${meta.weight}`)}`
    )
  }
}
