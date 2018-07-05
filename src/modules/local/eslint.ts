import * as Bluebird from 'bluebird'
import chalk from 'chalk'
import { copy, mkdir, remove } from 'fs-extra'
import * as inquirer from 'inquirer'
import { basename, dirname, join } from 'path'
import { curry, prop } from 'ramda'

import { UserCancelledError } from '../../errors'
import log from '../../logger'

const { mapSeries } = Bluebird
const eslintAssets = [
  '.eslintrc',
  'node_modules/eslint',
  'node_modules/.bin/eslint',
  'node_modules/babel-eslint',
]

const overwriteFile = (origin: string, dest: string, asset: string): Bluebird<void> => {
  const destFilePath = join(dest, asset)
  return remove(destFilePath)
    .then(() => copy(join(origin, asset), destFilePath))
    .tap(() => log.warn(`Overwrote ${destFilePath}`))
}

const promptOverwrite = (message: string): Bluebird<boolean> => {
  console.log(chalk.blue('!'), message)
  return Promise.resolve(
    inquirer.prompt({
      type: 'confirm',
      name: 'confirm',
      message: 'Do you wish to overwrite it?',
    }),
  )
    .then<boolean>(prop('confirm'))
}

const handleLinkError = curry((origin: string, dest: string, asset: string, preConfirm: boolean, err): Bluebird<never | void> => {
  if (err.code && err.code === 'EEXIST') {
    const fileName = basename(err.dest)
    return preConfirm
      ? overwriteFile(origin, dest, asset)
      : promptOverwrite(`${fileName} already exists on ${dirname(err.dest)}`)
        .then(confirm => {
          if (!confirm) {
            log.error('Couldn\'t complete eslint setup')
            throw new UserCancelledError()
          }
          return overwriteFile(origin, dest, asset)
        })
  }
  return Promise.reject(err)
})

const copyEslint = (origin: string, dest: string, preConfirm: boolean): Bluebird<never | void[]> => {
  const toCopy = eslintAssets.map(a => {
    return () =>
      copy(join(origin, a), join(dest, a))
        .catch(handleLinkError(origin, dest, a, preConfirm))
  })
  return mapSeries(toCopy, fn => fn())
}

export default (options) => {
  log.info('Linking eslint setup... LOL')
  const preConfirm = options.y || options.yes
  const root = process.cwd()
  const pkg = join(__dirname, '../../..')
  return mkdir(join(root, 'node_modules'))
    .then(() => mkdir(join(root, 'node_modules/.bin')))
    .catch(err => {
      return err.code && err.code === 'EEXIST'
        ? Promise.resolve()
        : Promise.reject(err)
    })
    .then(() => copyEslint(pkg, root, preConfirm))
    .then(() => log.info('Successfully linked eslint setup!'))
}
