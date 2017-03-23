import {join} from 'path'
import * as chalk from 'chalk'
import {createReadStream} from 'fs-promise'

export const id = (manifest: Manifest): string =>
  `${manifest.vendor}.${manifest.name}@${manifest.version}`

export const mapFileObject = (files: string[], root = process.cwd()): BatchStream[] =>
  files.map(path => ({path, contents: createReadStream(join(root, path))}))

export const workspaceMasterMessage =
  ` ${chalk.green('master')} is ${chalk.red('read-only')}, please use another workspace`
