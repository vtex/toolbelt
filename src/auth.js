import request from 'request-promise'
import {Promise} from 'bluebird'
import {prop} from 'ramda'
import log from './logger'

export function getTemporaryToken () {
  return request({json: true, uri: 'https://vtexid.vtex.com.br/api/vtexid/pub/authentication/start'})
  .then(prop('authenticationToken'))
}

export function sendCodeToEmail (token, email) {
  log.debug('Sending code to email', {token, email})
  return request({
    uri: 'https://vtexid.vtex.com.br/api/vtexid/pub/authentication/accesskey/send',
    qs: {authenticationToken: token, email},
  })
}

export function getEmailCodeAuthenticationToken (token, email, code) {
  log.debug('Getting auth token with email code', {token, email, code})
  return request({
    json: true,
    uri: 'https://vtexid.vtex.com.br/api/vtexid/pub/authentication/accesskey/validate',
    qs: {login: email, accesskey: code, authenticationToken: token},
  })
}

export function getPasswordAuthenticationToken (token, email, password) {
  log.debug('Getting auth token with password', {token, email, password})
  return request({
    json: true,
    uri: 'https://vtexid.vtex.com.br/api/vtexid/pub/authentication/classic/validate',
    qs: {authenticationToken: encodeURIComponent(token), login: encodeURIComponent(email), password: encodeURIComponent(password)},
  })
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
