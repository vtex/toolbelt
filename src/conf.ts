import * as Configstore from 'configstore'

import {name as pkgName} from '../package.json'

const conf = new Configstore(pkgName)

export const saveAccount = (account: string): void =>
  conf.set('account', account)

export const saveLogin = (login: string): void =>
  conf.set('login', login)

export const saveToken = (token: string): void =>
  conf.set('token', token)

export const saveWorkspace = (workspace = 'master') =>
  conf.set('workspace', workspace)

export const getAccount = (): string =>
  conf.get('account')

export const getLogin = (): string =>
  conf.get('login')

export const getToken = (): string =>
  conf.get('token')

export const getWorkspace = (): string =>
  conf.get('workspace')

export const clear = (): void =>
  conf.clear()
