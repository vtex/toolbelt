import chalk from 'chalk'
import enquirer from 'enquirer'
import { map, prop } from 'ramda'

import { getAccount } from '../../../utils/conf'
import { UserCancelledError } from '../../../utils/errors'
import log from '../../../utils/logger'
import { promptConfirm } from '../../../utils/prompts'
import { abtester, installedABTester } from '../../../utils/test/ab'
import { testAbStatus } from './status'

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

const promptWorkspaceToFinishABTest = () =>
  abtester
    .status()
    .then(map(({ WorkspaceB }) => WorkspaceB))
    .then((workspaces: string[]) =>
      enquirer.prompt({
        name: 'workspace',
        message: 'Choose which workspace to finish A/B testing:',
        type: 'select',
        choices: workspaces,
      })
    )
    .then(prop('workspace'))

export async function testAbFinish() {
  await installedABTester()
  const workspace = await promptWorkspaceToFinishABTest()
  await promptContinue(workspace)
  log.info('Finishing A/B tests')
  log.info('Latest results:')
  await testAbStatus()
  await abtester.finish(workspace)
  log.info(`A/B testing with workspace ${chalk.blue(workspace)} is now finished`)
  log.info(`No traffic currently directed to ${chalk.blue(workspace)}`)
}
