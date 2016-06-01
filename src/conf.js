import Configstore from 'configstore'
import pkg from '../package.json'

const conf = new Configstore(pkg.name)

export default conf

export function saveAccount (account) {
  conf.set('account', account)
}

export function saveLogin (login) {
  conf.set('login', login)
}

export function saveToken (token) {
  conf.set('token', token)
}

export function clear () {
  conf.clear()
}
