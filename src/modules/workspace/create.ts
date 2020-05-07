import chalk from 'chalk'

import { workspaces } from '../../clients'

import { CommandError } from '../../errors'
import { Builder } from '../../lib/clients/Builder'
import { createWorkspacesClient } from '../../lib/clients/Workspaces'
import { SessionManager } from '../../lib/session/SessionManager'
import log from '../../logger'
import { ensureValidEdition } from './common/edition'
import { SessionManager } from '../../lib/session/SessionManager'

const VALID_WORKSPACE = /^[a-z][a-z0-9]{0,126}[a-z0-9]$/

const warmUpRouteMap = async (workspace: string) => {
  try {
    const builder = Builder.createClient({ workspace })
    await builder.availability('vtex.builder-hub@0.x', null)
    log.debug('Warmed up route map')
  } catch (err) {} // eslint-disable-line no-empty
}

export default async (name: string, options: any) => {
  if (!VALID_WORKSPACE.test(name)) {
    throw new CommandError("Whoops! That's not a valid workspace name. Please use only lowercase letters and numbers.")
  }
  log.debug('Creating workspace', name)
  let production = false
  if (options.p || options.production) {
    production = true
  }
  try {
    await workspaces.create(SessionManager.getSingleton().account, name, production)
    log.info(
      `Workspace ${chalk.green(name)} created ${chalk.green('successfully')} with ${chalk.green(
        `production=${production}`
      )}`
    )
    await ensureValidEdition(name)
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
