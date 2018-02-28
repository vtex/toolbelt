import chalk from 'chalk'
import {prop, curry} from 'ramda'
import * as inquirer from 'inquirer'
import * as Bluebird from 'bluebird'
import {basename, dirname, join} from 'path'
import {mkdir, unlink, symlink} from 'fs-extra'

import log from '../../logger'

const {mapSeries} = Bluebird
const eslintAssets = [
  '.eslintrc',
  'node_modules/eslint',
  'node_modules/.bin/eslint',
  'node_modules/babel-eslint',
]

const overwriteFile = (origin: string, dest: string, asset: string): Bluebird<void> => {
  const destFilePath = join(dest, asset)
  return unlink(destFilePath)
    .then(() => symlink(join(origin, asset), destFilePath))
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
              return process.exit()
            }
            return overwriteFile(origin, dest, asset)
          })
  }
  return Promise.reject(err)
})

const linkEslint = (origin: string, dest: string, preConfirm: boolean): Bluebird<never | void[]> => {
  const symlinks = eslintAssets.map(a => {
    return () =>
      symlink(join(origin, a), join(dest, a))
        .catch(handleLinkError(origin, dest, a, preConfirm))
  })
  return mapSeries(symlinks, fn => fn())
}

export default (options) => {
  log.info('Linking eslint setup...')
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
    .then(() => linkEslint(pkg, root, preConfirm))
    .then(() => log.info('Successfully linked eslint setup!'))
}
