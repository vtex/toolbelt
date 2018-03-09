import chalk from 'chalk'

import {CommandError} from '../../errors'
import log from '../../logger'
import {apps, workspaces} from '../../clients'
import {getAccount, getWorkspace} from '../../conf'

const {listLinks} = apps
const {set, get} = workspaces
const [account, currentWorkspace] = [getAccount(), getWorkspace()]

const canGoLive = async (): Promise<void> => {
  const links = await listLinks()
  if (links.length > 0) {
    throw new CommandError('You have links on your workspace, please unlink them before setting production mode')
  }
}

const pretty = p => p ? chalk.green('true') : chalk.red('false')

export default async (production: any) => {
  const prod = production === 'true'
    ? true
    : production === 'false'
      ? false
      : null

  if (prod === null) {
    const meta = await get(account, currentWorkspace)
    return log.info(`Workspace ${chalk.green(currentWorkspace)} production=${pretty(meta.production)}`)
  }

  if (prod) {
    await canGoLive()
  } else if (currentWorkspace === 'master') {
    throw new CommandError(`Cannot set workspace master to production=${pretty(prod)}`)
  }

  log.debug(`Setting workspace ${currentWorkspace} to production=${prod}`)
  return set(account, currentWorkspace, {production: prod})
    .tap(() => log.info(`Workspace ${chalk.green(currentWorkspace)} set to production=${pretty(prod)}`))
}
