import http from './http'
import {Promise} from 'bluebird'
import {prop} from 'ramda'
import log from './logger'

export function getTemporaryToken () {
  return http('https://vtexid.vtex.com.br/api/vtexid/pub/authentication/start')
    .json()
    .then(prop('authenticationToken'))
}

export function sendCodeToEmail (token, email) {
  log.debug('Sending code to email', {token, email})
  return http('https://vtexid.vtex.com.br/api/vtexid/pub/authentication/accesskey/send')
    .query({authenticationToken: token, email})
    .json()
}

export function getEmailCodeAuthenticationToken (token, email, code) {
  log.debug('Getting auth token with email code', {token, email, code})
  return http('https://vtexid.vtex.com.br/api/vtexid/pub/authentication/accesskey/validate')
    .query({login: email, accesskey: code, authenticationToken: token})
    .json()
}

export function getPasswordAuthenticationToken (token, email, password) {
  log.debug('Getting auth token with password', {token, email, password})
  return http('https://vtexid.vtex.com.br/api/vtexid/pub/authentication/classic/validate')
    .query({authenticationToken: encodeURIComponent(token), login: encodeURIComponent(email), password: encodeURIComponent(password)})
    .json()
}

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
  return getTemporaryToken()
  .then(t => { token = t })
  .then(() => [token, email])
  .spread(sendCodeToEmail)
  .then(prompt)
  .then(({code}) => [token, email, code])
  .spread(getEmailCodeAuthenticationToken)
  .then(handleAuthResult)
}

export function userAuth (email, prompt) {
  let token
  return getTemporaryToken()
  .then(t => { token = t })
  .then(prompt)
  .then(({password}) => [token, email, password])
  .spread(getPasswordAuthenticationToken)
  .then(handleAuthResult)
}

export function startUserAuth (email, promptCode, promptPass) {
  return isVtexUser(email) ? vtexUserAuth(email, promptCode) : userAuth(email, promptPass)
}
