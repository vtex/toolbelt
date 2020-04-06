import { flags } from '@oclif/command'
import chalk from 'chalk'

import { createClients, workspaces } from '../../clients'
import { getAccount } from '../../conf'
import { CommandError } from '../../errors'
import { CustomCommand } from '../../lib/CustomCommand'
import log from '../../logger'

const VALID_WORKSPACE = /^[a-z][a-z0-9]{0,126}[a-z0-9]$/

const warmUpRouteMap = async (workspace: string) => {
  try {
    const { builder } = createClients({ workspace: workspace })
    await builder.availability('vtex.builder-hub@0.x', null)
    log.debug('Warmed up route map')
  } catch (err) {
    return
  }
}

export const createWorkspace = async (name: string, production: boolean) => {
  if (!VALID_WORKSPACE.test(name)) {
    throw new CommandError("Whoops! That's not a valid workspace name. Please use only lowercase letters and numbers.")
  }
  log.debug('Creating workspace', name)
  try {
    await workspaces.create(getAccount(), name, production)
    log.info(
      `Workspace ${chalk.green(name)} created ${chalk.green('successfully')} with ${chalk.green(
        `production=${production}`
      )}`
    )
    // First request on a brand new workspace takes very long because of route map generation, so we warm it up.
    await warmUpRouteMap(name)
  } catch (err) {
    if (err.response && err.response.data.code === 'WorkspaceAlreadyExists') {
      log.error(err.response.data.message)
      return
    }
    throw err
  }
}

export default class WorkspaceCreate extends CustomCommand {
  static description = 'Create a new workspace with this name'

  static examples = []

  static flags = {
    help: flags.help({ char: 'h' }),
    production: flags.boolean({ char: 'p', description: 'Create a production workspace', default: false }),
  }

  static args = [{ name: 'workspaceName' }]

  async run() {
    const { args, flags } = this.parse(WorkspaceCreate)
    const name = args.workspaceName
    await createWorkspace(name, flags.production)
  }
}
