import chalk from 'chalk'
import enquirer from 'enquirer'
import { compose, fromPairs, keys, map, mapObjIndexed, prop, values, zip } from 'ramda'
import semver from 'semver'

import log from '../../../api/logger'
import { promptConfirm } from '../../../api/modules/prompts'
import {
  abtester,
  installedABTester,
  formatDays,
  promptConstraintDuration,
  promptProductionWorkspace,
  promptProportionTrafic,
  SIGNIFICANCE_LEVELS,
} from './utils'

const promptSignificanceLevel = async (): Promise<string> => {
  const significanceTimePreviews = await Promise.all(
    compose<any, number[], Array<Promise<number>>>(
      map(value => abtester.preview(value as number)),
      values
    )(SIGNIFICANCE_LEVELS)
  )
  const significanceTimePreviewMap = fromPairs(zip(keys(SIGNIFICANCE_LEVELS), significanceTimePreviews))
  return enquirer
    .prompt({
      name: 'level',
      message: 'Choose the significance level:',
      type: 'select',
      choices: values(
        mapObjIndexed((value, key) => ({
          message: `${key} (~ ${formatDays(value as number)})`,
          value: key,
        }))(significanceTimePreviewMap)
      ) as any,
    })
    .then(prop('level'))
}

const promptContinue = (workspace: string, significanceLevel?: string) => {
  return significanceLevel
    ? promptConfirm(
        `You are about to start an A/B test between workspaces \
${chalk.green('master')} and ${chalk.green(workspace)} with \
${chalk.red(significanceLevel)} significance level. Proceed?`,
        false
      )
    : promptConfirm(
        `You are about to start an A/B test between workspaces \
${chalk.green('master')} and ${chalk.green(workspace)}. Proceed?`,
        false
      )
}

export default async () => {
  const abTesterManifest = await installedABTester()
  const workspace = await promptProductionWorkspace('Choose production workspace to start A/B test:')

  try {
    if (semver.satisfies(abTesterManifest.version, '>=0.10.0')) {
      log.info(`Setting workspace ${chalk.green(workspace)} to A/B test`)
      const promptAnswer = await promptContinue(workspace)
      if (!promptAnswer) return
      const proportion = Number(await promptProportionTrafic())
      const timeLength = Number(await promptConstraintDuration())
      await abtester.customStart(workspace, timeLength, proportion)
      log.info(`Workspace ${chalk.green(String(workspace))} in A/B test`)
      log.info(`You can stop the test using ${chalk.blue('vtex workspace abtest finish')}`)
      return
    }

    const significanceLevel = await promptSignificanceLevel()
    const promptAnswer = await promptContinue(workspace, significanceLevel)
    if (!promptAnswer) return
    const significanceLevelValue = SIGNIFICANCE_LEVELS[significanceLevel]
    log.info(`Setting workspace ${chalk.green(workspace)} to A/B test with \
        ${significanceLevel} significance level`)
    await abtester.startLegacy(workspace, significanceLevelValue)
    log.info(`Workspace ${chalk.green(workspace)} in A/B test`)
    log.info(`You can stop the test using ${chalk.blue('vtex workspace abtest finish')}`)
  } catch (err) {
    if (err.message === 'Workspace not found') {
      console.log(`Test not initialized due to workspace ${workspace} not found by ab-tester.`)
    }
  }
}
