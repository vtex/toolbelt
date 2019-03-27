import chalk from 'chalk'

import { abtester, workspaces } from '../../../clients'
import { getAccount, getWorkspace } from '../../../conf'
import { UserCancelledError } from '../../../errors'
import log from '../../../logger'
import { promptConfirm } from '../../prompts'
import list from '../list'

const { set } = workspaces
const [account, currentWorkspace] = [getAccount(), getWorkspace()]

const promptContinue = async () => {
  const proceed = await promptConfirm(
      `You are about to abort all AB Testing in this account. Are you sure?`,
      false
    )
  if (!proceed) {
    throw new UserCancelledError()
  }
}

export default async () => {
  await promptContinue()
  log.info(`Resetting workspace ${chalk.blue('master')} to weight=100%`)
  await set(account, 'master', { production: true, weight: 100 })
  const response = await abtester.Abort(currentWorkspace)
  console.log(response)
  list()
}
