// TODO: move everything here into different packages.
import request from 'request-promise'
import {Promise} from 'bluebird'
import {prop} from 'ramda'
import log from './logger'

export function getTemporaryToken () {
  // TODO: check if `callbackUrl` can be removed
  return request({json: true, uri: 'https://vtexid.vtex.com.br/api/vtexid/pub/authentication/start?callbackUrl='})
  .then(prop('authenticationToken'))
}

export function sendCodeToEmail (token, email) {
  // TODO use qs
  log.debug('Sending code to email', {token, email})
  const query = `authenticationToken=${token}&email=${email}`
  return request(`https://vtexid.vtex.com.br/api/vtexid/pub/authentication/accesskey/send?${query}`)
}

export function getEmailCodeAuthenticationToken (token, email, code) {
  // TODO use qs
  log.debug('Getting auth token with email code', {token, email, code})
  const query = `login=${email}&accesskey=${code}&authenticationToken=${token}`
  return request({json: true, uri: `https://vtexid.vtex.com.br/api/vtexid/pub/authentication/accesskey/validate?${query}`})
}

export function getPasswordAuthenticationToken (token, email, password) {
  // TODO use qs
  log.debug('Getting auth token with password', {token, email, password})
  const query = `authenticationToken=${encodeURIComponent(token)}&login=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`
  return request({json: true, uri: `https://vtexid.vtex.com.br/api/vtexid/pub/authentication/classic/validate?${query}`})
}

export function isVtexUser (email) {
  return email.indexOf('@vtex.com') >= 0
}

export function handleAuthResult (result) {
  if (!result.authStatus === 'Success') {
    return Promise.reject(result.authSuccess)
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

export function createWorkspace (token, email, account) {
  return request({
    uri: `http://workspaces.vtex.com/${account}/workspaces`,
    method: 'POST',
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.vtex.gallery.v0+json',
      'Content-Type': 'application/json',
    },
    json: {
      name: `sb_${email}`,
    },
  })
}
