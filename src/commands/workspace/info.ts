import { flags as oclifFlags } from '@oclif/command'
import chalk from 'chalk'

import { workspaces } from '../../clients'
import { getAccount, getWorkspace } from '../../conf'
import { CustomCommand } from '../../utils/CustomCommand'
import log from '../../logger'

const { get } = workspaces
const [account, currentWorkspace] = [getAccount(), getWorkspace()]

const pretty = p => (p ? chalk.green('true') : chalk.red('false'))

export default class WorkspaceInfo extends CustomCommand {
  static description = 'Display information about the current workspace'

  static aliases = ['info']

  static examples = ['vtex workspace:info', 'vtex info']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
  }

  static args = []

  async run() {
    this.parse(WorkspaceInfo)
    const meta = await get(account, currentWorkspace)
    const weight = currentWorkspace === 'master' ? 100 : meta.weight
    return log.info(
      `Workspace: name=${chalk.green(currentWorkspace)} production=${pretty(meta.production)} weight=${weight}`
    )
  }
}
