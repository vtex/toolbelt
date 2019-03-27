import chalk from 'chalk'

import { workspaces } from '../../../clients'
import {getAccount, getWorkspace} from '../../../conf'
import {CommandError } from '../../../errors'

export const DEFAULT_PROBABILITY_VALUE = 70
export const [account, currentWorkspace] = [getAccount(), getWorkspace()]

const { get } = workspaces

export const checkIfInProduction = async (): Promise<void> => {
  const workspaceData = await get(account, currentWorkspace)
  if (!workspaceData.production) {
    throw new CommandError(
    `Only ${chalk.green('production')} workspaces can be \
used for testing. Please create a production workspace with \
${chalk.blue('vtex use <workspace> -r -p')} or reset this one with \
${chalk.blue('vtex workspace reset -p')}`
)
  }
}
