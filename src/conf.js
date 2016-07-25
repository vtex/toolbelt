import Configstore from 'configstore'
import pkg from '../package.json'

const conf = new Configstore(pkg.name)

export function saveAccount (account) {
  conf.set('account', account)
}

export function saveLogin (login) {
  conf.set('login', login)
}

export function saveToken (token) {
  conf.set('token', token)
}

export function saveWorkspace (workspace) {
  return conf.set('workspace', workspace)
}

export function getAccount () {
  return conf.get('account')
}

export function getLogin () {
  return conf.get('login')
}

export function getToken () {
  return conf.get('token')
}

export function getWorkspace () {
  return conf.get('workspace')
}

export function clear () {
  conf.clear()
}
