import fs from 'fs'
import {basename, dirname, join} from 'path'
import log from '../logger'
import {Promise, promisify, all} from 'bluebird'

const mkdir = promisify(fs.mkdir)
const symlink = promisify(fs.symlink)
const eslintAssets = [
  '.eslintrc',
  'node_modules/eslint',
  'node_modules/.bin/eslint',
  'node_modules/babel-eslint',
  'node_modules/.bin/babel-eslint',
]
const linkEslint = (origin, dest) =>
  all(eslintAssets.map(a => symlink(join(origin, a), join(dest, a))))

export default {
  setup: {
    eslint: {
      description: 'Setup a local eslint environment',
      handler: () => {
        log.info('Linking eslint setup...')
        const root = process.cwd()
        const pkg = join(__dirname, '../..')
        return mkdir(join(root, 'node_modules'))
        .then(() => mkdir(join(root, 'node_modules/.bin')))
        .catch(err => {
          return err.code && err.code === 'EEXIST'
            ? Promise.resolve()
            : Promise.reject(err)
        })
        .then(() => linkEslint(pkg, root))
        .then(() => log.info('Successfully linked eslint setup!'))
        .catch(err => {
          if (err.code && err.code === 'EEXIST') {
            log.error(`${basename(err.dest)} already exists on ${dirname(err.dest)}`)
            log.error('Remove your current eslint setup and run this command again')
            return process.exit(1)
          }
          return Promise.reject(err)
        })
      },
    },
  },
}
