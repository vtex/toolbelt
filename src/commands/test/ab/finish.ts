import { flags as oclifFlags } from '@oclif/command'
import chalk from 'chalk'
import enquirer from 'enquirer'
import { map, prop } from 'ramda'

import { getAccount } from '../../../conf'
import { UserCancelledError } from '../../../errors'
import log from '../../../logger'
import { promptConfirm } from '../../../lib/prompts'
import { CustomCommand } from '../../../lib/CustomCommand'
import { installedABTester, abtester } from '../../../lib/test/ab'
import { abTestStatus } from './status'

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

export default class ABTestFinish extends CustomCommand {
  static description = 'Stop all AB testing in current account'

  static examples = []

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
  }

  static args = []

  async run() {
    this.parse(ABTestFinish)

    await installedABTester()
    const workspace = await promptWorkspaceToFinishABTest()
    await promptContinue(workspace)
    log.info('Finishing A/B tests')
    log.info('Latest results:')
    await abTestStatus()
    await abtester.finish(workspace)
    log.info(`A/B testing with workspace ${chalk.blue(workspace)} is now finished`)
    log.info(`No traffic currently directed to ${chalk.blue(workspace)}`)
  }
}
