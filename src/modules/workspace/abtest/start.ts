import chalk from 'chalk'

import { abtester, workspaces } from '../../../clients'
import { CommandError, UserCancelledError } from '../../../errors'
import log from '../../../logger'
import { promptConfirm } from '../../prompts'
import list from '../list'
import {
  account,
  checkIfInProduction,
  currentWorkspace,
  DEFAULT_PROBABILITY_VALUE
} from './utils'

const DEFAULT_WEIGHT_VALUE = 50

const { set } = workspaces

const promptContinue = async (weight, probability) => {
  const proceed = await promptConfirm(
      `You are about to start an AB Test between workspaces \
${chalk.blue('master')} and ${chalk.blue(currentWorkspace)} (weight=${weight}%) \
and probability ${probability}%`,
      false
    )
  if (!proceed) {
    throw new UserCancelledError()
  }
}

const parseOptionWeight = (optionWeight: number) => {
  let weight
  if (Number.isInteger(optionWeight) && optionWeight > 0 && optionWeight < 100) {
    weight = optionWeight
  } else {
    throw new CommandError(`The weight for workspace AB test must be an integer \
between 0 and 100`)
  }
  return weight
}

export default async (
  weight=DEFAULT_WEIGHT_VALUE,
  probability=DEFAULT_PROBABILITY_VALUE
) => {
  await promptContinue(weight, probability)
  weight = parseOptionWeight(weight)
  await checkIfInProduction()
  log.info(`Setting workspace ${chalk.green(currentWorkspace)} to AB test with \
weight=${weight} and `)
  await set(account, currentWorkspace, { production: true, weight })
  const response = await abtester.Initialize(currentWorkspace, probability)
  console.log(response)
  log.info(
    `Workspace ${chalk.green(currentWorkspace)} in AB Test with weight=${weight}`
  )
  log.info(
    `You can stop the test using ${chalk.blue('vtex workspace abtest abort')}`
  )
  list()
}
