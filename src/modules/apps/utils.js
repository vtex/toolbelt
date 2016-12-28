import chalk from 'chalk'
import {createReadStream} from 'fs'
import {join} from 'path'
import {manifest} from '../../manifest'
import userAgent from '../../user-agent'
import {VBaseClient, AppsClient, AppEngineClient, RegistryClient} from '@vtex/api'
import {getToken, getAccount, getWorkspace} from '../../conf'
import endpoint from '../../endpoint'
import timeout from '../../timeout'

const appsBaseUrl = 'http://apps-engine-env-beta.us-east-1.elasticbeanstalk.com'

export const id = `${manifest.vendor}.${manifest.name}@${manifest.version}`

export const appsClient = () => new AppsClient(appsBaseUrl, {authToken: getToken(), userAgent, timeout})

export const appEngineClient = () => new AppEngineClient(endpoint('apps'), {authToken: getToken(), userAgent, timeout})

export const registryClient = () => new RegistryClient(endpoint('registry'), {authToken: getToken(), userAgent, timeout})

export const vbaseClient = () => new VBaseClient(endpoint('api'), {authToken: getToken(), userAgent, timeout})

export const installApp = (id) =>
  appsClient().installApp(
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
