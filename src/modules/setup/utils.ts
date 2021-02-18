import util from 'util'
import { pipeline } from 'stream'

import axios from 'axios'
import tar from 'tar'

import log from '../../api/logger'
import { FileReaderWriter } from './includes/FileReaderWriter'
import { SessionManager } from '../../api/session/SessionManager'

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
        headers: { Authorization: SessionManager.getSingleton().token },
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
 * @returns The package.json object
 */
export function getRootPackageJson(): Record<string, any> {
  try {
    return packageJsonEditor.read('.')
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
export function hasDevDependenciesInstalled({ deps, pkg }: { deps: Record<string, string>; pkg: Record<string, any> }) {
  return Object.keys(deps).every(p => p in pkg.devDependencies)
}

/**
 * Sort the given object. Useful for sorting the `package.json` dependencies
 */
export function sortObject<T extends object>(obj: T): T {
  return Object.keys(obj)
    .sort((strA, strB) => strA.localeCompare(strB))
    .reduce((sortedObject, key) => ({ ...sortedObject, [key]: obj[key] }), {}) as T
}
