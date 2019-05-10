import chalk from 'chalk'
import * as enquirer from 'enquirer'
import { map, prop } from 'ramda'

import { getAccount } from '../../../conf'
import { UserCancelledError } from '../../../errors'
import log from '../../../logger'
import { promptConfirm } from '../../prompts'
import { default as abTestStatus } from './status'
import {
  checkIfABTesterIsInstalled,
  getABTester,
  promptAndUseMaster,
  promptAndUsePreviousWorkspace,
} from './utils'

const [account] = [getAccount()]

const promptContinue = async (workspace: string) => {
  const proceed = await promptConfirm(
    `You are about to finish A/B testing in workspace \
${chalk.blue(workspace)}, account ${chalk.green(account)}. Are you sure?`,
      false
    )
  if (!proceed) {
    throw new UserCancelledError()
  }
}

const promptWorkspaceToFinishABTest = async () =>
  await getABTester().status()
    .then(map(({WorkspaceB}) => WorkspaceB))
    .then(workspaces =>
      enquirer.prompt({
        name: 'workspace',
        message: 'Choose which workspace to finish A/B testing:',
        type: 'select',
        choices: workspaces,
      })
    )
    .then(prop('workspace'))

export default async () => {
  await promptAndUseMaster()
  try {
    await checkIfABTesterIsInstalled()
    const abtester = getABTester()
    const workspace = await promptWorkspaceToFinishABTest()
    await promptContinue(workspace)
    log.info('Finishing A/B tests')
    log.info(`Latest results:`)
    await abTestStatus()
    await abtester.finish(workspace)
    log.info(`A/B testing with workspace ${chalk.blue(workspace)} is now finished`)
    log.info(`No traffic currently directed to ${chalk.blue(workspace)}`)
  } catch (err) {
    log.error('Unhandled exception')
    await promptAndUsePreviousWorkspace()
    throw err
  }
  await promptAndUsePreviousWorkspace()
}
