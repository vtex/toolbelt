import chalk from 'chalk'
import * as numeral from 'numeral'

import { workspaces } from '../../../clients'
import { getAccount, getWorkspace } from '../../../conf'
import { CommandError } from '../../../errors'

export const SIGNIFICANCE_LEVELS = {
  low: 0.5,
  mid: 0.7,
  high: 0.9,
}

export const [account, currentWorkspace] = [getAccount(), getWorkspace()]

const { get } = workspaces

export const formatDays = (days: number | string) => {
  let suffix = 'days'
  const numberOfDays = numeral(days)
  if (numberOfDays === 1) {
    suffix = 'day'
  }
  return `${numeral(days).format('0,0')} ${suffix}`
}

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
