import {vtexid} from './clients.js'
import {Promise} from 'bluebird'
import log from './logger'

const client = vtexid()

export function isVtexUser (email) {
  return email.indexOf('@vtex.com') >= 0
}

export function handleAuthResult (result) {
  if (result.authStatus !== 'Success') {
    return Promise.reject(result.authStatus)
  }
  return result.authCookie.Value
}

export function vtexUserAuth (email, prompt) {
  let token
  return client.getTemporaryToken()
  .then(t => { token = t })
  .then(() => [token, email])
  .tap(() => log.debug('Sending code to email', {token, email}))
  .spread(client.sendCodeToEmail.bind(client))
  .then(prompt)
  .then(({code}) => [token, email, code])
  .tap(() => log.debug('Getting auth token with email code', {token, email}))
  .spread(client.getEmailCodeAuthenticationToken.bind(client))
  .then(handleAuthResult)
}

export function userAuth (email, prompt) {
  let token
  return client.getTemporaryToken()
  .then(t => { token = t })
  .then(prompt)
  .then(({password}) => [token, email, password])
  .tap(() => log.debug('Getting auth token with password', {token, email}))
  .spread(client.getPasswordAuthenticationToken.bind(client))
  .then(handleAuthResult)
}

export function startUserAuth (email, promptCode, promptPass) {
  return isVtexUser(email) ? vtexUserAuth(email, promptCode) : userAuth(email, promptPass)
}
