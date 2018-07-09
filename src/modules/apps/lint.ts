import * as Bluebird from 'bluebird'
import { copy, mkdir, remove } from 'fs-extra'
import { join } from 'path'
import { curry } from 'ramda'
import log from '../../logger'

const eslintAssets = [
  '.eslintrc',
  'node_modules/eslint',
  'node_modules/.bin/eslint',
  'node_modules/babel-eslint',
]

const lint = async (root: string): Promise<any> => {
  const pkg = join(__dirname, '../../..')
  return mkdir(join(root, 'node_modules'))
    .then(() => mkdir(join(root, 'node_modules/.bin')))
    .catch(err => {
      return err.code && err.code === 'EEXIST'
        ? Promise.resolve()
        : Promise.reject(err)
    })
    .then(() => copyEslint(pkg, root))
    .then(() => log.info('Successfully copied eslint setup!'))
}

const copyEslint = (origin: string, dest: string): Bluebird<never | void[]> => {
  const toCopy = eslintAssets.map(a => {
    return () => {
      const originAsset: string = join(origin, a)
      const destAsset: string = join(dest, a)
      return copy(originAsset, destAsset)
        .catch(overwriteFile(originAsset, destAsset))
    }

  })
  return Bluebird.mapSeries(toCopy, fn => fn())
}

const overwriteFile = curry((origin: string, dest: string, err: any): Bluebird<void> => {
  if (err.code && err.code === 'EEXIST') {
    return remove(dest)
      .then(() => copy(origin, dest))
      .tap(() => log.warn(`Overwrote ${dest}`))
  }
  return Promise.reject(err)
})

export default lint
