import chalk from 'chalk'

import { abtester } from '../../../clients'
import { getAccount, getWorkspace } from '../../../conf'
import { UserCancelledError } from '../../../errors'
import log from '../../../logger'
import { promptConfirm } from '../../prompts'
import { default as abTestStatus } from './status'

const [account, currentWorkspace] = [getAccount(), getWorkspace()]

const promptContinue = async () => {
  const proceed = await promptConfirm(
    `You are about to finish all A/B testing in account ${chalk.blue(account)}. Are you sure?`,
      false
    )
  if (!proceed) {
    throw new UserCancelledError()
  }
}

export default async () => {
  await promptContinue()
  log.info('Finishing A/B tests')
  log.info(`Latest results:`)
  await abTestStatus()
  await abtester.finish(currentWorkspace)
  log.info(`A/B testing with workspace ${chalk.blue(currentWorkspace)} is now finished`)
  log.info(`100% of traffic is now directed to ${chalk.blue('master')}`)
}
