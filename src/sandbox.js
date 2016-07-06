import chalk from 'chalk'
import {Promise} from 'bluebird'
import {WorkspacesClient} from '@vtex/workspaces'
import userAgent from './user-agent'
import {getDevWorkspace} from './workspace'

export function createSandbox (account, login, token) {
  return new WorkspacesClient({
    authToken: token,
    userAgent: userAgent,
  }).create(account, getDevWorkspace(login))
  .then(res => ({status: res.statusCode}))
  .catch(res => {
    // Treat 409 (already created) as success
    return res.statusCode === 409
    ? Promise.resolve({status: res.statusCode, body: res.response.body})
    : Promise.reject(res)
  })
}

export function logChanges (changes) {
  return changes.reduce((acc, change) => {
    const newline = acc.length === 0 ? '' : '\n'
    if (change.action === 'remove') {
      return acc + `${newline}${chalk.red('D')} ${change.path}`
    }
    return acc + `${newline}${chalk.yellow('U')} ${change.path}`
  }, '')
}
