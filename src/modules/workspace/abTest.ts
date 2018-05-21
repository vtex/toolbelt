import chalk from 'chalk'
import * as inquirer from 'inquirer'
import { apps, workspaces } from '../../clients'
import { getAccount, getWorkspace } from '../../conf'
import { CommandError } from '../../errors'
import log from '../../logger'
import list from './list'

const { listLinks } = apps
const { set } = workspaces
const [account, currentWorkspace] = [getAccount(), getWorkspace()]

const promptContinue = async () => {
  const { proceed } = await inquirer.prompt({
    name: 'proceed',
    message: `You are about to change the weight of workspace ${chalk.red('master')}. Do you want to continue?`,
    type: 'confirm',
  })
  if (!proceed) {
    process.exit()
  }
}

const canGoLive = async (): Promise<void> => {
  const links = await listLinks()
  if (links.length > 0) {
    throw new CommandError(`You have links on your workspace. Please unlink all apps (${chalk.blue('vtex unlink --all')}) before setting AB test mode`)
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
    throw new CommandError('The weight for workspace AB test must be a positive integer')
  }

  if (weight) {
    await canGoLive()
  }

  try {
    log.debug(`Setting workspace ${chalk.green(currentWorkspace)} to AB test with weight=${weight}`)
    await set(account, currentWorkspace, { production: weight !== 0, weight })
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
