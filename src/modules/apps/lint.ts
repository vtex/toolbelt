import * as Bluebird from 'bluebird'
import { copy, mkdir, remove } from 'fs-extra'
import { join } from 'path'
import { compose, cond, curry, equals, path, T } from 'ramda'
import log from '../../logger'

const eslintAssets = [
  '.eslintrc',
  'node_modules/eslint',
  'node_modules/.bin/eslint',
  'node_modules/babel-eslint',
]

const lint = async (root: string): Promise<any> =>
  mkdir(join(root, 'node_modules'))
    .then(() => mkdir(join(root, 'node_modules/.bin')))
    .catch(cond([
      [compose(equals('EEXIST'), path(['code'])), _ => Promise.resolve()],
      [T, Promise.reject]
    ]))
    .then(() => copyEslint(join(__dirname, '../../..'), root))
    .then(() => log.info('Successfully copied eslint setup!'))


const copySeries = (origin: string, dest: string): Array<() => Promise<void>> =>
  eslintAssets.map(a => () =>
    copy(join(origin, a), join(dest, a))
      .catch(overwriteFile(join(origin, a), join(dest, a)))
  )

const copyEslint = (origin: string, dest: string): Bluebird<never | void[]> =>
  Bluebird.mapSeries(copySeries(origin, dest), fn => fn())


const overwriteFile = curry((origin: string, dest: string, err: any): Bluebird<void> => {
  if (err.code && err.code === 'EEXIST') {
    return remove(dest)
      .then(() => copy(origin, dest))
      .tap(() => log.warn(`Overwrote ${dest}`))
  }
  return Promise.reject(err)
})

export default lint
