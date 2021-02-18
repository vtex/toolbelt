import Configstore from 'configstore'
import { dirname } from 'path'

import { name as pkgName } from '../../package.json'

const conf = new Configstore(pkgName)

export const configDir = dirname(conf.path)

export enum Environment {
  Production = 'prod',
}

export const CLUSTER_DEFAULT_VALUE = ''

export const ENV_DEFAULT_VALUE = Environment.Production

export const saveEnvironment = (env: Environment) => conf.set('env', env)

export const saveStickyHost = (appName: string, stickyHost: string) =>
  conf.set(`apps.${appName}.sticky-host`, { stickyHost, lastUpdated: Date.now() })

export const getStickyHost = (appName: string): { stickyHost: string; lastUpdated: Date } =>
  conf.get(`apps.${appName}.sticky-host`)

export const hasStickyHost = (appName: string): boolean => conf.has(`apps.${appName}.sticky-host`)

export const getNextFeedbackDate = (): string => conf.get('_nextFeedbackDate')

export const saveNextFeedbackDate = (date: string) => conf.set('_nextFeedbackDate', date)

const envFromProcessEnv = {
  prod: Environment.Production,
}

export const getEnvironment = (): Environment => {
  const env = envFromProcessEnv[process.env.VTEX_ENV]
  const persisted = conf.get('env') || ENV_DEFAULT_VALUE
  return env || persisted
}

export enum Region {
  Production = 'aws-us-east-1',
}

export const saveCluster = (cluster: string) => {
  conf.set('cluster', cluster)
}

export const getCluster = () => {
  return conf.get('cluster') || CLUSTER_DEFAULT_VALUE
}
