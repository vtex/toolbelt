import chalk from 'chalk'
import moment from 'moment'
import {Promise} from 'bluebird'
import userAgent from './user-agent'
import {SandboxesClient} from '@vtex/apps'
import {getDevWorkspace} from './workspace'
import {WorkspacesClient} from '@vtex/workspaces'

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

export function listRoot ({vendor, name, version}, login, token) {
  return new SandboxesClient({
    authToken: token,
    userAgent: userAgent,
  }).listRootFolders(
    vendor,
    login,
    name,
    version,
    { list: true, '_limit': 1000 }
  )
  .catch(({error}) => {
    const sandboxNotFound = error.code === 'sandbox_not_found'
    const sandboxedAppNotFound = error.code === 'sandboxed_app_not_found'
    if (sandboxNotFound || sandboxedAppNotFound) {
      return Promise.resolve({data: []})
    }
    Promise.reject(error)
  })
}

export function logChanges (changes) {
  const time = moment().format('HH:mm:ss')
  return changes.reduce((acc, change) => {
    const prefix = chalk.dim(
      acc.length === 0 ? `[${time}] ` : `\n[${time}] `
    )
    if (change.action === 'remove') {
      return acc + `${prefix}${chalk.red('D')} ${change.path}`
    }
    return acc + `${prefix}${chalk.yellow('U')} ${change.path}`
  }, '')
}

export function updateFiles ({vendor, name, version}, login, token, changes) {
  return new SandboxesClient({
    authToken: token,
    userAgent: userAgent,
  }).updateFiles(
    vendor,
    login,
    name,
    version,
    changes
  )
}
