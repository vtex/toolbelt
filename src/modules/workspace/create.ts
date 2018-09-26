import chalk from 'chalk'

import { workspaces } from '../../clients'
import { getAccount } from '../../conf'
import { CommandError } from '../../errors'
import log from '../../logger'

const VALID_WORKSPACE = /^[a-z][a-z0-9-]{0,126}[a-z0-9]$/

export default async (name: string) => {
  if (!VALID_WORKSPACE.test(name)) {
    throw new CommandError('Whoops! That\'s not a valid workspace name. Please use only lowercase letters, numbers and hyphens.')
  }
  log.debug('Creating workspace', name)
  try {
    await workspaces.create(getAccount(), name)
    log.info(`Workspace ${chalk.green(name)} created ${chalk.green('successfully')}`)
  } catch (err) {
    if (err.response && err.response.data.code === 'WorkspaceAlreadyExists') {
      log.error(err.response.data.message)
      return
    }
    throw err
  }
}
