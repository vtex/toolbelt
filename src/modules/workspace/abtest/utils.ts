import { AppManifest, Apps } from '@vtex/api'
import chalk from 'chalk'
import enquirer from 'enquirer'
import numbro from 'numbro'
import { compose, filter, map, prop } from 'ramda'

import { workspaces } from '../../../clients'
import { ABTester } from '../../../clients/abTester'
import { getAccount, getToken } from '../../../conf'
import * as env from '../../../env'
import { CommandError } from '../../../errors'
import envTimeout from '../../../timeout'
import userAgent from '../../../user-agent'
import { dummyLogger } from '../../../clients/dummyLogger'

const account = getAccount()

const DEFAULT_TIMEOUT = 15000

export const SIGNIFICANCE_LEVELS = {
  low: 0.5,
  mid: 0.7,
  high: 0.9,
}

const contextForMaster = {
  account,
  authToken: getToken(),
  production: false,
  product: '',
  region: env.region(),
  route: {
    id: '',
    params: {},
  },
  userAgent,
  workspace: 'master',
  requestId: '',
  operationId: '',
  logger: dummyLogger,
  platform: '',
}

const options = { timeout: (envTimeout || DEFAULT_TIMEOUT) as number }

// Clients for the 'master' workspace
export const abtester = new ABTester(contextForMaster, { ...options, retries: 3 })
export const apps = new Apps(contextForMaster, options)

export const formatDays = (days: number) => {
  let suffix = 'days'
  if (days === 1) {
    suffix = 'day'
  }
  return `${numbro(days).format('0,0')} ${suffix}`
}

export const formatDuration = (durationInMinutes: number) => {
  const minutes = durationInMinutes % 60
  const hours = Math.trunc(durationInMinutes / 60) % 24
  const days = Math.trunc(durationInMinutes / (60 * 24))
  return `${days} days, ${hours} hours and ${minutes} minutes`
}

export const installedABTester = async (): Promise<AppManifest> => {
  try {
    return await apps.getApp('vtex.ab-tester@x')
  } catch (e) {
    if (e.response.data.code === 'app_not_found') {
      throw new CommandError(`The app ${chalk.yellow('vtex.ab-tester')} is \
not installed in account ${chalk.green(account)}, workspace \
${chalk.blue('master')}. Please install it before attempting to use A/B \
testing functionality`)
    }
    throw e
  }
}

export const promptProductionWorkspace = async (promptMessage: string): Promise<string> => {
  const productionWorkspaces = await workspaces.list(account).then(
    compose<any, any, any>(
      map(({ name }) => name),
      filter(({ name, production }) => production === true && name !== 'master')
    )
  )
  return await enquirer
    .prompt({
      name: 'workspace',
      message: promptMessage,
      type: 'select',
      choices: productionWorkspaces,
    })
    .then(prop('workspace'))
}

export const promptConstraintDuration = async (): Promise<string> => {
  const message = 'The amount of time should be an integer.'
  return prop(
    'time',
    await enquirer.prompt({
      name: 'proportion',
      message: "What's the amount of time respecting the restriction?",
      validate: s => /^[0-9]+$/.test(s) || message,
      filter: s => s.trim(),
      type: 'input',
    })
  )
}

export const promptProportionTrafic = async (): Promise<string> => {
  const message = 'The proportion of traffic directed to a workspace should be an integer between 0 and 10000.'
  return prop(
    'proportion',
    await enquirer.prompt({
      name: 'proportion',
      message: `What's the proportion of traffic initially directed to workspace ${chalk.blue('master')}?
      This should be an integer between 0 and 10000 that corresponds each 1% to 100, i.e. if you want to direct 54.32% of traffic to master, this value should be 5432.
      If you don't want to fix this value, just type any value here and set the next restriction to 0.`,
      validate: s => /^([0-9]{1,4}|10000)$/.test(s) || message,
      filter: s => s.trim(),
      type: 'input',
    })
  )
}
