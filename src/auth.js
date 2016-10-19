import userAgent from './user-agent'
import {VTEXIDClient} from '@vtex/api'
import {Promise} from 'bluebird'
import log from './logger'
import endpoint from './endpoint'

const options = {authToken: 'token', userAgent}
const vtexid = new VTEXIDClient(endpoint('vtexid'), options)

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
  return vtexid.getTemporaryToken()
  .then(t => { token = t })
  .then(() => [token, email])
  .tap(() => log.debug('Sending code to email', {token, email}))
  .spread(vtexid.sendCodeToEmail.bind(vtexid))
  .then(prompt)
  .then(({code}) => [token, email, code])
  .tap(() => log.debug('Getting auth token with email code', {token, email}))
  .spread(vtexid.getEmailCodeAuthenticationToken.bind(vtexid))
  .then(handleAuthResult)
}

export function userAuth (email, prompt) {
  let token
  return vtexid.getTemporaryToken()
  .then(t => { token = t })
  .then(prompt)
  .then(({password}) => [token, email, password])
  .tap(() => log.debug('Getting auth token with password', {token, email}))
  .spread(vtexid.getPasswordAuthenticationToken.bind(vtexid))
  .then(handleAuthResult)
}

export function startUserAuth (email, promptCode, promptPass) {
  return isVtexUser(email) ? vtexUserAuth(email, promptCode) : userAuth(email, promptPass)
}
