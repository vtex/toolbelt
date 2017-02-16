import chalk from 'chalk'
import {createReadStream} from 'fs'
import {join} from 'path'

export const id = (manifest) => `${manifest.vendor}.${manifest.name}@${manifest.version}`

export const mapFileObject = (files, root = process.cwd()) => {
  return files.map(path => {
    return {
      path,
      contents: createReadStream(join(root, path)),
    }
  })
}

export const workspaceMasterMessage = `${chalk.green('master')} is ${chalk.red('read-only')}, please use another workspace`
