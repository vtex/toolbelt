import chalk from 'chalk'

import {workspaces} from '../../clients'
import {getAccount, getWorkspace} from '../../conf'
import log from '../../logger'

const {get} = workspaces
const [account, currentWorkspace] = [getAccount(), getWorkspace()]

const pretty = p => p ? chalk.green('true') : chalk.red('false')

export default async () => {
  const meta = await get(account, currentWorkspace)
  const weight = currentWorkspace === 'master' ? 100 : meta.weight
  return log.info(`Workspace: name=${chalk.green(currentWorkspace)} production=${pretty(meta.production)} weight=${weight}`)
}
