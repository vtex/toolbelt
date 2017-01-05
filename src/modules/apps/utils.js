import chalk from 'chalk'
import {createReadStream} from 'fs'
import {join} from 'path'
import {manifest} from '../../manifest'
import userAgent from '../../user-agent'
import {VBaseClient, AppEngineClient, AppRegistryClient} from '@vtex/api'
import {getToken, getAccount, getWorkspace} from '../../conf'
import endpoint from '../../endpoint'
import timeout from '../../timeout'

export const id = `${manifest.vendor}.${manifest.name}@${manifest.version}`

export const appEngineClient = () => new AppEngineClient(endpoint('apps'), {authToken: getToken(), userAgent, timeout})

export const registryClient = () => new AppRegistryClient(endpoint('registry'), {authToken: getToken(), userAgent, timeout})

export const vbaseClient = () => new VBaseClient(endpoint('api'), {authToken: getToken(), userAgent, timeout})

export const installApp = (id) =>
  appEngineClient().installApp(
    getAccount(),
    getWorkspace(),
    {id}
  )

export const mapFileObject = (files) => {
  return files.map(path => {
    return {
      path,
      contents: createReadStream(join(process.cwd(), path)),
    }
  })
}

export const publishApp = (files, isDevelopment = false) => {
  return registryClient().publishApp(
    getAccount(),
    files,
    isDevelopment
  )
}

export const workspaceMasterMessage = `${chalk.green('master')} is ${chalk.red('read-only')}, please use another workspace`
