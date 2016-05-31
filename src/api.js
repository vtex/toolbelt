// TODO: move everything here into different packages.
import request from 'request-promise'
import {prop} from 'ramda'

export function getTemporaryToken () {
  // TODO: check if `callbackUrl` can be removed
  return request({json: true, uri: 'https://vtexid.vtex.com.br/api/vtexid/pub/authentication/start?callbackUrl='})
  .then(prop('authenticationToken'))
}

export function sendCodeToEmail (token, email) {
  // TODO use qs
  const query = `authenticationToken=${token}&email=${email}`
  return request(`https://vtexid.vtex.com.br/api/vtexid/pub/authentication/accesskey/send?${query}`)
}

export function getEmailCodeAuthenticationToken (token, email, code) {
  // TODO use qs
  const query = `login=${email}&accesskey=${code}&authenticationToken=${token}`
  return request({json: true, uri: `https://vtexid.vtex.com.br/api/vtexid/pub/authentication/accesskey/validate?${query}`})
}

export function getPasswordAuthenticationToken (token, email, password) {
  // TODO use qs
  const query = `authenticationToken=${encodeURIComponent(token)}&login=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`
  return request({json: true, uri: `https://vtexid.vtex.com.br/api/vtexid/pub/authentication/classic/validate?${query}`})
}

export function vtexUserAuth (email, prompt) {
  let token
  return getTemporaryToken()
  .then(t => { token = t })
  .then(() => [token, email])
  .spread(sendCodeToEmail)
  .then(prompt)
  .then(code => [token, email, code])
  .spread(getEmailCodeAuthenticationToken)
}

export function userAuth (email, prompt) {
  let token
  return getTemporaryToken()
  .then(t => { token = t })
  .then(prompt)
  .then(password => [token, email, password])
  .spread(getPasswordAuthenticationToken)
}

export function isVtexUser (login) {
  return login.indexOf('@vtex.com') >= 0
}

export function startUserAuth (login, promptCode, promptPass) {
  return isVtexUser(login) ? vtexUserAuth(login, promptCode) : userAuth(login, promptPass)
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
