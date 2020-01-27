import * as util from 'util'
import { pipeline } from 'stream'

import axios from 'axios'
import * as tar from 'tar'

import { getToken } from '../../conf'
import log from '../../logger'
import { FileReaderWriter } from './includes/FileReaderWriter'

export const packageJsonEditor = new FileReaderWriter('packageJson')
export const eslintrcEditor = new FileReaderWriter('eslintrc')
export const tsconfigEditor = new FileReaderWriter('tsconfig')
export const eslintIgnoreEditor = new FileReaderWriter('eslintIgnore', false)
export const prettierrcEditor = new FileReaderWriter('prettierrc')

export const checkIfTarGzIsEmpty = (url: string) => {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    try {
      const res = await axios.get(url, {
        responseType: 'stream',
        headers: { Authorization: getToken() },
      })
      let fileCount = 0
      const fileEmitter = tar.list()
      fileEmitter.on('entry', () => (fileCount += 1))
      await util.promisify(pipeline)([res.data, fileEmitter])
      resolve(fileCount === 0)
    } catch (err) {
      reject(err)
    }
  })
}

/**
 * Reads and parses the root package.json file
 *
 * @export
 * @returns {PackageJSON}
 */
export function getRootPackageJson() {
  try {
    return packageJsonEditor.read('.') as PackageJSON
  } catch (err) {
    if (err.code !== 'ENOENT') {
      log.error(err)
    }
  }
  return null
}

/**
 * Checks if every dev dependency of a dependency map is installed in a package.json
 * @param {{ deps: Record<string, string>; pkg: PackageJSON }} { deps, pkg }
 * @returns {boolean}
 */
export function hasDevDependenciesInstalled({ deps, pkg }: { deps: Record<string, string>; pkg: PackageJSON }) {
  return Object.keys(deps).every(p => p in pkg.devDependencies)
}
