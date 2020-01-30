import Configstore from 'configstore'
import { dirname } from 'path'

import { name as pkgName } from '../package.json'

const conf = new Configstore(pkgName)

export const configDir = dirname(conf.path)

export enum Environment {
  Production = 'prod',
}

export const saveAll = (config: any): void => {
  conf.all = config
}
export const saveAccount = (account: string): void => {
  const lastUsedAccount = getAccount()
  if (lastUsedAccount !== account) {
    conf.set('_lastUsedAccount', lastUsedAccount)
    conf.delete('_lastUsedWorkspace')
  }
  conf.set('account', account)
}

export const saveLogin = (login: string): void => conf.set('login', login)

export const saveToken = (token: string): void => conf.set('token', token)

export const saveWorkspace = (workspace = 'master') => {
  const lastUsedWorkspace = getWorkspace()
  if (lastUsedWorkspace !== workspace) {
    conf.set('_lastUsedWorkspace', lastUsedWorkspace)
  }
  conf.set('workspace', workspace)
}

export const saveEnvironment = (env: Environment) => conf.set('env', env)

export const saveStickyHost = (appName: string, stickyHost: string) =>
  conf.set(`apps.${appName}.sticky-host`, { stickyHost, lastUpdated: Date.now() })

export const getAll = (): any => conf.all

export const getAccount = (): string => conf.get('account')

export const getLogin = (): string => conf.get('login')

export const getToken = (): string => conf.get('token')

export const getWorkspace = (): string => conf.get('workspace')

export const getStickyHost = (appName: string): { stickyHost: string; lastUpdated: Date } =>
  conf.get(`apps.${appName}.sticky-host`)

export const hasStickyHost = (appName: string): boolean => conf.has(`apps.${appName}.sticky-host`)

export const getLastUsedAccount = (): string => conf.get('_lastUsedAccount')

export const getLastUsedWorkspace = (): string => conf.get('_lastUsedWorkspace')

export const getNextFeedbackDate = (): string => conf.get('_nextFeedbackDate')

export const saveNextFeedbackDate = (date: string) => conf.set('_nextFeedbackDate', date)

const envFromProcessEnv = {
  prod: Environment.Production,
}

export const getEnvironment = (): Environment => {
  const env = envFromProcessEnv[process.env.VTEX_ENV]
  const persisted = conf.get('env') || Environment.Production
  return env || persisted
}

export const clear = (): void => conf.clear()

export const currentContext: Context = {
  account: getAccount(),
  workspace: getWorkspace(),
}

export enum Region {
  Production = 'aws-us-east-1',
}

export const saveAccountToken = (account: string, token: string) => {
  conf.set(`tokens.${account}`, token)
}

export const getTokens = () => {
  return conf.get('tokens') || {}
}

export const saveCluster = (cluster: string) => {
  conf.set('cluster', cluster)
}

export const getCluster = () => {
  return conf.get('cluster') || ''
}
