import chalk from 'chalk'
import * as enquirer from 'enquirer'
import * as numbro from 'numbro'
import { compose, filter, map, prop } from 'ramda'

import { apps, workspaces } from '../../../clients'
import { ABTester } from '../../../clients/abTester'
import { getAccount, getToken, getWorkspace } from '../../../conf'
import * as env from '../../../env'
import { CommandError, UserCancelledError } from '../../../errors'
import userAgent from '../../../user-agent'
import { promptConfirm } from '../../prompts'
import { default as useWorkspace } from '../use'

const { getApp } = apps


export const SIGNIFICANCE_LEVELS = {
  low: 0.5,
  mid: 0.7,
  high: 0.9,
}

const contextForABTester = () => ({
  account: getAccount(),
  authToken: getToken(),
  production: false,
  region: env.region(),
  route: {
    id: '',
    params: {},
  } ,
  userAgent,
  workspace: 'master',
  requestId: '',
  operationId: '',
})

export const getABTester = () => new ABTester(contextForABTester(), { retries: 3 })

export const [account, currentWorkspace] = [getAccount(), getWorkspace()]

const { get } = workspaces

export const formatDays = (days: number) => {
  let suffix = 'days'
  if (days === 1) {
    suffix = 'day'
  }
  return `${numbro(days).format('0,0')} ${suffix}`
}


export const formatDuration = (durationInMinutes: number) => {
  const minutes = durationInMinutes % 60
  const hours = Math.trunc(durationInMinutes/60) % 24
  const days = Math.trunc(durationInMinutes/(60 * 24))
  return `${days} days, ${hours} hours and ${minutes} minutes`
}

export const checkIfInProduction = async (): Promise<void> => {
  const workspaceData = await get(account, currentWorkspace)
  if (!workspaceData.production) {
    throw new CommandError(
    `Only ${chalk.green('production')} workspaces can be \
used for A/B testing. Please create a production workspace with \
${chalk.blue('vtex use <workspace> -r -p')} or reset this one with \
${chalk.blue('vtex workspace reset -p')}`
)
  }
}

export const checkIfABTesterIsInstalled = async () => {
  try {
    await getApp('vtex.ab-tester@x')
  } catch (e) {
    if (e.response.data.code === 'app_not_found') {
      throw new CommandError(`The app ${chalk.yellow('vtex.ab-tester')} is \
not installed in account ${chalk.green(account)}, workspace \
${chalk.blue(currentWorkspace)}. Please install it before attempting to use A/B \
testing functionality`)
    }
    throw e
  }
}

export const promptProductionWorkspace = async (
  promptMessage: string
) => {
  const productionWorkspaces = await workspaces.list(account)
    .then(
      compose<any, any, any>(
        map(({name}) => name),
        filter(({name, production}) => (production === true && name !== 'master'))
      )
    )
  return await enquirer.prompt({
    name: 'workspace',
    message: promptMessage,
    type: 'select',
    choices: productionWorkspaces,
  }).then(prop('workspace'))

}

export const promptAndUseMaster = async () => {
  if (currentWorkspace !== 'master') {
    const proceed = await promptConfirm(
      `To operate A/B tests, you must be using the ${chalk.green('master')} \
workspace. Do you whish to use it?`,
      true
    )
    if (!proceed) {
      throw new UserCancelledError()
    }
    await useWorkspace('master')
  }
}

export const promptAndUsePreviousWorkspace = async () => {
  if (currentWorkspace !== 'master') {
    const proceed = await promptConfirm(
      `Do you wish to return to using the ${chalk.green(currentWorkspace)} workspace?`,
      true
    )
    if (!proceed) {
      throw new UserCancelledError()
    }
    await useWorkspace(currentWorkspace)
  }
}
