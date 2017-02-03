import chalk from 'chalk'
import {createReadStream} from 'fs'
import {join} from 'path'
import {manifest} from '../../manifest'

export const id = `${manifest.vendor}.${manifest.name}@${manifest.version}`

export const mapFileObject = (files) => {
  return files.map(path => {
    return {
      path,
      contents: createReadStream(join(process.cwd(), path)),
    }
  })
}

export const workspaceMasterMessage = `${chalk.green('master')} is ${chalk.red('read-only')}, please use another workspace`
