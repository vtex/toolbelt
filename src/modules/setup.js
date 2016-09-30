import fs from 'fs'
import chalk from 'chalk'
import {curry} from 'ramda'
import log from '../logger'
import inquirer from 'inquirer'
import {basename, dirname, join} from 'path'
import {Promise, promisify, mapSeries} from 'bluebird'

const mkdir = promisify(fs.mkdir)
const unlink = promisify(fs.unlink)
const symlink = promisify(fs.symlink)
const eslintAssets = [
  '.eslintrc',
  'node_modules/eslint',
  'node_modules/.bin/eslint',
  'node_modules/babel-eslint',
]

function linkEslint (origin, dest, preConfirm) {
  const symlinks = eslintAssets.map(a => {
    return () =>
      symlink(join(origin, a), join(dest, a))
      .catch(handleLinkError(origin, dest, a, preConfirm))
  })
  return mapSeries(symlinks, fn => fn())
}

function promptOverwrite (message) {
  console.log(chalk.blue('!'), message)
  return Promise.try(() =>
    inquirer.prompt({
      type: 'confirm',
      name: 'confirm',
      message: 'Do you wish to overwrite it?',
    })
  )
  .then(({confirm}) => confirm)
}

function overwriteFile (origin, dest, asset) {
  const destFilePath = join(dest, asset)
  return unlink(destFilePath)
  .then(symlink(join(origin, asset), destFilePath))
  .tap(() => log.warn(`Overwrote ${destFilePath}`))
}

const handleLinkError = curry((origin, dest, asset, preConfirm, err) => {
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

export default {
  setup: {
    eslint: {
      description: 'Setup a local eslint environment',
      options: [
        {
          short: 'y',
          long: 'yes',
          description: 'Auto confirm prompts',
          type: 'boolean',
        },
      ],
      handler: (options) => {
        log.info('Linking eslint setup...')
        const preConfirm = options.y || options.yes
        const root = process.cwd()
        const pkg = join(__dirname, '../..')
        return mkdir(join(root, 'node_modules'))
        .then(() => mkdir(join(root, 'node_modules/.bin')))
        .catch(err => {
          return err.code && err.code === 'EEXIST'
            ? Promise.resolve()
            : Promise.reject(err)
        })
        .then(() => linkEslint(pkg, root, preConfirm))
        .then(() => log.info('Successfully linked eslint setup!'))
      },
    },
  },
}
