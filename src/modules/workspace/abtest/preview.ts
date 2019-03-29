import chalk from 'chalk'

import { abtester } from '../../../clients'
import log from '../../../logger'
import {
  account,
  checkIfInProduction,
  currentWorkspace,
  DEFAULT_PROBABILITY_VALUE
} from './utils'

export default async (probability=DEFAULT_PROBABILITY_VALUE) => {
  await checkIfInProduction()
  const ABTestDurationEstimate = await abtester.preview(probability)
  log.info(`AB Tester estimates that testing ${chalk.blue(currentWorkspace)}
against ${chalk.blue('master')} in account ${chalk.yellow(account)} with
probability ${chalk.green(`${DEFAULT_PROBABILITY_VALUE}`)} will take
${chalk.red(ABTestDurationEstimate)}`)
}
