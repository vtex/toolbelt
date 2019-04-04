import chalk from 'chalk'

import { abtester } from '../../../clients'
import { getAccount, getWorkspace } from '../../../conf'
import { UserCancelledError } from '../../../errors'
import log from '../../../logger'
import { promptConfirm } from '../../prompts'
import list from '../list'
import { default as abTestStatus } from './status'

const [account, currentWorkspace] = [getAccount(), getWorkspace()]

const promptContinue = async () => {
  const proceed = await promptConfirm(
    `You are about to finish all AB testing in account ${chalk.blue(account)}. Are you sure?`,
      false
    )
  if (!proceed) {
    throw new UserCancelledError()
  }
}

export default async () => {
  await promptContinue()
  log.info('Finishing AB tests')
  log.info(`Latest results:`)
  await abTestStatus()
  await abtester.abort(currentWorkspace)
  log.info(`All AB testing is now finished.`)
  log.info(`100% of traffic is now directed to ${chalk.blue('master')}`)
  list()
}
