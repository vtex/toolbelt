import chalk from 'chalk'

import { apps, workspaces } from '../../clients'
import { getAccount, getWorkspace } from '../../conf'
import { CommandError } from '../../errors'
import log from '../../logger'

const { listLinks } = apps
const { set } = workspaces
const [account, currentWorkspace] = [getAccount(), getWorkspace()]

const canGoLive = async (): Promise<void> => {
  const links = await listLinks()
  if (links.length > 0) {
    throw new CommandError(`You have links on your workspace. Please try another workspace or reset this one (${chalk.blue('vtex workspace reset ' + currentWorkspace)}) before setting production mode`)
  }
}

const pretty = p => p ? chalk.green('production mode') : chalk.red('development mode')

export default async (production: any) => {
  let prod

  if (production === null || production === 'true' || production === undefined) {
    prod = true
  } else if (production === 'false') {
    prod = false
  } else {
    throw new CommandError('Argument for command production must be either true or false.')
  }

  if (prod) {
    await canGoLive()
  } else if (currentWorkspace === 'master') {
    throw new CommandError(`Cannot set workspace master to production=${pretty(prod)}`)
  }

  log.debug(`Setting workspace ${currentWorkspace} to production=${prod}`)
  await set(account, currentWorkspace, { production: prod })
  log.info(`Workspace ${chalk.green(currentWorkspace)} set to ${pretty(prod)}`)
  if (prod) {
    log.info(`You can now check your changes before publishing them`)
    log.info(`If everything is fine, promote with ${chalk.blue('vtex promote')}`)
  } else {
    log.info(`You may now link apps again`)
  }
}
