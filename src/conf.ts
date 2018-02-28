import * as Configstore from 'configstore'

import {name as pkgName} from '../package.json'

const conf = new Configstore(pkgName)

export enum Environment {
  Production = 'prod',
  Staging = 'staging',
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

export const getAccount = (): string =>
  conf.get('account')

export const getLogin = (): string =>
  conf.get('login')

export const getToken = (): string =>
  conf.get('token')

export const getWorkspace = (): string =>
  conf.get('workspace')

export const getEnvironment = (): Environment =>
  conf.get('env')

export const clear = (): void =>
  conf.clear()

export const currentContext: Context = {
  account: getAccount(),
  workspace: getWorkspace(),
}
