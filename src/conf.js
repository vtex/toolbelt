import Configstore from 'configstore'
import pkg from '../package.json'

const conf = new Configstore(pkg.name)

const overrides = {}

export function saveAccount (account) {
  conf.set('account', account)
}

export function saveLogin (login) {
  conf.set('login', login)
}

export function saveToken (token) {
  conf.set('token', token)
}

export function saveWorkspace (workspace = 'master') {
  return conf.set('workspace', workspace)
}

export function getAccount (): string {
  return getConf('account')
}

export function getLogin (): string {
  return getConf('login')
}

export function getToken (): string {
  return getConf('token')
}

export function getWorkspace (): string {
  return getConf('workspace')
}

export function clear () {
  conf.clear()
}

export function override (key: string, value: string) {
  overrides[key] = value
}

function getConf (key: string): string {
  return overrides[key] || conf.get(key)
}
