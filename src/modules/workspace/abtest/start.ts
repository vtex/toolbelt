import chalk from 'chalk'
import enquirer from 'enquirer'
import { compose, fromPairs, keys, map, mapObjIndexed, prop, values, zip } from 'ramda'
import semver from 'semver'

import { UserCancelledError } from '../../../errors'
import log from '../../../logger'
import { promptConfirm } from '../../prompts'
import { abtester, installedABTester, formatDays, promptProductionWorkspace, SIGNIFICANCE_LEVELS } from './utils'

const promptSignificanceLevel = async () => {
  const significanceTimePreviews = await Promise.all(
    compose<any, number[], Array<Promise<number>>>(
      map(value => abtester.preview(value as number)),
      values
    )(SIGNIFICANCE_LEVELS)
  )
  const significanceTimePreviewMap = fromPairs(zip(keys(SIGNIFICANCE_LEVELS), significanceTimePreviews))
  return await enquirer
    .prompt({
      name: 'level',
      message: 'Choose the significance level:',
      type: 'select',
      choices: values(
        mapObjIndexed((value, key) => ({
          message: `${key} (~ ${formatDays(value as number)})`,
          value: key,
        }))(significanceTimePreviewMap)
      ),
    })
    .then(prop('level'))
}

const promptContinue = async (workspace: string, significanceLevel?: string) => {
  const proceed = significanceLevel
    ? await promptConfirm(
        `You are about to start an A/B test between workspaces \
${chalk.green('master')} and ${chalk.green(workspace)} with \
${chalk.red(significanceLevel)} significance level. Proceed?`,
        false
      )
    : await promptConfirm(
        `You are about to start an A/B test between workspaces \
${chalk.green('master')} and ${chalk.green(workspace)}. Proceed?`,
        false
      )
  if (!proceed) {
    throw new UserCancelledError()
  }
}

export default async () => {
  const abTesterManifest = await installedABTester()
  const workspace = await promptProductionWorkspace('Choose production workspace to start A/B test:')

  try {
    if (semver.satisfies(abTesterManifest.version, '>=0.10.0')) {
      log.info(`Setting workspace ${chalk.green(workspace)} to A/B test`)
      await abtester.start(workspace)
      await promptContinue(workspace)
      log.info(`Workspace ${chalk.green(workspace)} in A/B test`)
      log.info(`You can stop the test using ${chalk.blue('vtex workspace abtest finish')}`)
      return
    }

    const significanceLevel = await promptSignificanceLevel()
    await promptContinue(workspace, significanceLevel)
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
