import fs from 'fs'
import path from 'path'
import log from '../logger'
import {flip, curry} from 'ramda'
import {Promise, promisify, all} from 'bluebird'

const mkdir = promisify(fs.mkdir)
const symlink = promisify(fs.symlink)
const flippedJoin = curry(flip(path.join))
const joinEslint = flippedJoin('eslint')
const joinEslintRc = flippedJoin('.eslintrc')
const joinBin = flippedJoin('node_modules/.bin')

function linkEslint (origin, dest) {
  const destBin = joinBin(dest)
  const originBin = joinBin(origin)
  return all([
    symlink(joinEslintRc(origin), joinEslintRc(dest)),
    symlink(joinEslint(originBin), joinEslint(destBin)),
  ])
}

export default {
  setup: {
    eslint: {
      description: 'Setup a local eslint environment',
      handler: () => {
        log.info('Linking eslint setup...')
        const root = process.cwd()
        const rootBin = joinBin(root)
        const pkg = path.join(__dirname, '../..')
        return mkdir(path.join(root, 'node_modules'))
        .then(() => mkdir(rootBin))
        .catch(err => {
          return err.code && err.code === 'EEXIST'
            ? Promise.resolve()
            : Promise.reject(err)
        })
        .then(() => linkEslint(pkg, root))
        .then(() => log.info('Succesfully linked eslint setup!'))
        .catch(err => {
          if (err.code && err.code === 'EEXIST') {
            log.error(`${path.basename(err.dest)} already exists on ${path.dirname(err.dest)}`)
            log.error('Remove your current eslint setup and run this command again')
            return process.exit(1)
          }
          return Promise.reject(err)
        })
      },
    },
  },
}
