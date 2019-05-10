import chalk from 'chalk'
import * as enquirer from 'enquirer'
import { compose, fromPairs, keys, map, mapObjIndexed, prop, values, zip } from 'ramda'

import { abtester } from '../../../clients'
import { UserCancelledError } from '../../../errors'
import log from '../../../logger'
import { promptConfirm } from '../../prompts'
import { default as useWorkspace } from '../use'
import {
  checkIfABTesterIsInstalled,
  currentWorkspace,
  formatDays,
  promptProductionWorkspace,
  SIGNIFICANCE_LEVELS,
} from './utils'

const promptSignificanceLevel = async () => {
  const significanceTimePreviews = await Promise.all(
    compose<any, number[], Array<Promise<number>>>(
      map(value => abtester.preview(value as number)),
      values
    )(SIGNIFICANCE_LEVELS)
  )
  const significanceTimePreviewMap = fromPairs(
    zip(
      keys(SIGNIFICANCE_LEVELS),
      significanceTimePreviews
    )
  )
  return await enquirer.prompt({
    name: 'level',
    message: 'Choose the significance level:',
    type: 'select',
    choices: values(
      mapObjIndexed(
        (value, key) => (
           {
             message:`${key} (~ ${formatDays(value as number)})`,
             value: key,
        }
        ))(significanceTimePreviewMap)
    ),
  }).then(prop('level'))
}

const promptContinue = async (significanceLevel: string) => {
  const proceed = await promptConfirm(
    `You are about to start an A/B test between workspaces \
${chalk.green('master')} and ${chalk.green(currentWorkspace)} with \
${chalk.red(significanceLevel)} significance level. Proceed?`,
  false
  )
  if (!proceed) {
    throw new UserCancelledError()
  }
}

const promptAndUseMaster = async () => {
  if (currentWorkspace !== 'master') {
    const proceed = await promptConfirm(
      `To trigger an A/B test, you must be using the ${chalk.green('master')} \
workspace. Do you whish to use it?`,
      true
    )
    if (!proceed) {
      throw new UserCancelledError()
    }
    await useWorkspace('master')
  }
}

const promptAndUsePreviousWorkspace = async () => {
  if (currentWorkspace !== 'master') {
    const proceed = await promptConfirm(
      `Do you wish to return to using the ${chalk.green(currentWorkspace)} workspace?`,
      true
    )
    if (!proceed) {
      throw new UserCancelledError()
    }
    await useWorkspace(currentWorkspace)
  }
}

export default async () => {
  const workspace = await promptProductionWorkspace('Choose production workspace to start A/B test:')
  const significanceLevel = await promptSignificanceLevel()
  await promptAndUseMaster()
  try {
    await checkIfABTesterIsInstalled()
    await promptContinue(significanceLevel)
    const significanceLevelValue = SIGNIFICANCE_LEVELS[significanceLevel]
    log.info(`Setting workspace ${chalk.green(currentWorkspace)} to A/B test with \
      ${significanceLevel} significance level`)
    await abtester.start(workspace, significanceLevelValue)
    log.info(`Workspace ${chalk.green(workspace)} in A/B test`)
    log.info(
      `You can stop the test using ${chalk.blue('vtex workspace abtest abort')}`
    )
    await promptAndUsePreviousWorkspace()
  } catch (err) {
    log.error('Unhandled exception')
    await promptAndUsePreviousWorkspace()
    throw err
  }
}
