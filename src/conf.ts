import * as Configstore from 'configstore'

import { name as pkgName } from '../package.json'

const conf = new Configstore(pkgName)

export enum Environment {
  Production = 'prod',
  Staging = 'staging',
}

export const saveAll = (config: any): void => {
  conf.all = config
}
export const saveAccount = (account: string): void =>
  conf.set('account', account)

export const saveLogin = (login: string): void =>
  conf.set('login', login)

export const saveToken = (token: string): void =>
  conf.set('token', token)

export const saveWorkspace = (workspace = 'master') =>
  conf.set('workspace', workspace)

export const saveEnvironment = (env: Environment) =>
  conf.set('env', env)

export const getAll = (): any => conf.all

export const getAccount = (): string =>
  conf.get('account')

export const getLogin = (): string =>
  conf.get('login')

export const getToken = (): string =>
  conf.get('token')

export const getWorkspace = (): string =>
  conf.get('workspace')

const envFromProcessEnv = {
  'beta': Environment.Staging,
  'prod': Environment.Production,
  'staging': Environment.Staging,
}
let forcedEnv = null

export const forceEnvironment = (env: Environment) => {
  forcedEnv = env
}

export const getEnvironment = (): Environment => {
  const env = envFromProcessEnv[process.env.VTEX_ENV]
  const persisted = conf.get('env') || Environment.Production
  return forcedEnv || env || persisted
}

export const clear = (): void =>
  conf.clear()

export const currentContext: Context = {
  account: getAccount(),
  workspace: getWorkspace(),
}

export enum Region {
  Production = 'aws-us-east-1',
  Staging = 'aws-us-east-2',
}
