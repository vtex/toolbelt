import chalk from 'chalk'
import {prop} from 'ramda'

import {workspaces} from '../../clients'
import {getAccount, getWorkspace} from '../../conf'
import {CommandError, UserCancelledError} from '../../errors'
import log from '../../logger'
import { promptConfirm } from '../utils'
import list from './list'

const { get, set } = workspaces
const [account, currentWorkspace] = [getAccount(), getWorkspace()]

const promptContinue = async () => {
  const proceed = prop('proceed',
    await promptConfirm(
      `You are about to change the weight of workspace ${chalk.red('master')}. Do you want to continue?`,
      true
    )
  )
  if (!proceed) {
    throw new UserCancelledError()
  }
}

const canGoLive = async (): Promise<void> => {
  const workspaceData = await get(account, currentWorkspace)
  if (!workspaceData.production) {
    throw new CommandError(`Only ${chalk.green('production')} workspaces can be used for testing. Please create a production workspace with ${chalk.blue('vtex use <workspace> -r -p')} or reset this one with ${chalk.blue('vtex workspace reset -p')}`)
  }
}

export default async (optionWeight: number) => {
  let weight: number
  if (currentWorkspace === 'master') {
    if (optionWeight === 0) {
      throw new CommandError(`Cannot set weight ${chalk.red('zero')} to workspace ${chalk.red('master')}`)
    }
    await promptContinue()
  }
  if (optionWeight === null) {
    log.info('Using default weight value 100')
    weight = 100
  } else if (Number.isInteger(optionWeight) && optionWeight >= 0) {
    weight = optionWeight
  } else {
    throw new CommandError('The weight for workspace AB test must be a non-negative integer')
  }

  if (weight) {
    await canGoLive()
  }

  try {
    log.debug(`Setting workspace ${chalk.green(currentWorkspace)} to AB test with weight=${weight}`)
    await set(account, currentWorkspace, { production: true, weight })
    if (weight !== 0) {
      log.info(`Workspace ${chalk.green(currentWorkspace)} in AB Test with weight=${weight}`)
      if (currentWorkspace !== 'master') {
        log.info(`You can stop the test using ${chalk.blue('vtex workspace test 0')}`)
      }
    } else {
      log.info(`AB Test in workspace ${chalk.green(currentWorkspace)} terminated successfully`)
    }
    list()
  } catch (e) {
    throw (e)
  }
}
