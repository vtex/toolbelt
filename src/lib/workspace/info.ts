import chalk from 'chalk'

import { workspaces } from '../../clients'
import { getAccount, getWorkspace } from '../../utils/conf'
import log from '../../utils/logger'

const { get } = workspaces
const [account, currentWorkspace] = [getAccount(), getWorkspace()]

const pretty = p => (p ? chalk.green('true') : chalk.red('false'))

export async function workspaceInfo() {
  const meta = await get(account, currentWorkspace)
  const weight = currentWorkspace === 'master' ? 100 : meta.weight
  return log.info(
    `Workspace: name=${chalk.green(currentWorkspace)} production=${pretty(meta.production)} weight=${weight}`
  )
}
