import chalk from 'chalk'
import {apps, workspaces} from '../../clients'
import {getAccount, getWorkspace} from '../../conf'
import {CommandError} from '../../errors'
import log from '../../logger'

const {listLinks} = apps
const {set} = workspaces
const [account, currentWorkspace] = [getAccount(), getWorkspace()]

const canGoLive = async (): Promise<void> => {
  const links = await listLinks()
  if (links.length > 0) {
    throw new CommandError('You have links on your workspace, please unlink them before setting AB test mode')
  }
}

export default async (weight: any) => {
  let w

  if (currentWorkspace === 'master') {
      throw new CommandError(`Cannot set AB test between master and itself. Change the workspace`)
  }
  if (weight === null) {
    w = 50
  } else if (weight > 0 && weight < 100) {
    w = weight
  } else {
    throw new CommandError('The weight for workspace AB test must be a integer between 0 and 100.')
  }

  if (w) {
    await canGoLive()
  }

  log.debug(`Setting workspace ${currentWorkspace} to AB test with weight=${w}`)
  await set(account, currentWorkspace, {production: true, weight: w})
  await set(account, 'master', {weight: 100 - weight})
  log.info(`Workspace ${chalk.green(currentWorkspace)} in AB Test with master}`)
  log.info(`You can stop the test using ${chalk.blue('vtex workspace test 0')}`)
}
