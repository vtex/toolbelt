import chalk from 'chalk'
import {join} from 'path'
import {createReadStream} from 'fs'
import {manifest} from '../../manifest'
import {appEngine, appRegistry} from '../../clients'
import {getAccount, getWorkspace} from '../../conf'

export const id = `${manifest.vendor}.${manifest.name}@${manifest.version}`

export const installApp = (id) => {
  return appEngine().installApp(
    getAccount(),
    getWorkspace(),
    {id}
  )
}

export const publishApp = (files, tag = undefined) => {
  return appRegistry().publishApp(
    getAccount(),
    files,
    tag
  )
}

export const mapFileObject = (files) => {
  return files.map(path => {
    return {
      path,
      contents: createReadStream(join(process.cwd(), path)),
    }
  })
}

export const workspaceMasterMessage = `${chalk.green('master')} is ${chalk.red('read-only')}, please use another workspace`
