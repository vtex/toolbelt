import chalk from 'chalk'
import enquirer from 'enquirer'
import { map, prop } from 'ramda'

import log from '../../../api/logger'
import { promptConfirm } from '../../../api/modules/prompts'
import { default as abTestStatus } from './status'
import { abtester, installedABTester } from './utils'
import { SessionManager } from '../../../api/session/SessionManager'

const { account } = SessionManager.getSingleton()

const promptContinue = (workspace: string) => {
  return promptConfirm(
    `You are about to finish A/B testing in workspace \
${chalk.blue(workspace)}, account ${chalk.green(account)}. Are you sure?`,
    false
  )
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

export default async () => {
  await installedABTester()
  const workspace = await promptWorkspaceToFinishABTest()
  const promptAnswer = await promptContinue(workspace)
  if (!promptAnswer) {
    return
  }
  log.info('Finishing A/B tests')
  log.info(`Latest results:`)
  await abTestStatus()
  await abtester.finish(workspace)
  log.info(`A/B testing with workspace ${chalk.blue(workspace)} is now finished`)
  log.info(`No traffic currently directed to ${chalk.blue(workspace)}`)
}
