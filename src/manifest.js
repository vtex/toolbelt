import fs from 'fs'
import path from 'path'
import {promisify} from 'bluebird'

const readFile = promisify(fs.readFile)

export const vendorPattern = '[\\w_-]+'

export const namePattern = '[\\w_-]+'

export const versionPattern = '\\d+\\.\\d+\\.\\d+(-.*)?'

export const wildVersionPattern = '\\d+\\.((\\d+\\.\\d+)|(\\d+\\.x)|x)(-.*)?'

export function getAppManifest (root) {
  return readFile(path.resolve(root, 'manifest.json'), 'utf-8')
  .then(JSON.parse)
  .then(validateAppManifest)
}

export function validateAppManifest (manifest) {
  const vendorRegex = new RegExp(`^${vendorPattern}$`)
  const nameRegex = new RegExp(`^${namePattern}$`)
  const versionRegex = new RegExp(`^${versionPattern}$`)
  if (manifest.name === undefined) {
    throw new Error('Field \'name\' should be set in manifest.json file')
  }
  if (manifest.version === undefined) {
    throw new Error('Field \'version\' should be set in manifest.json file')
  }
  if (manifest.vendor === undefined) {
    throw new Error('Field \'vendor\' should be set in manifest.json file')
  }
  if (!nameRegex.test(manifest.name)) {
    throw new Error('Field \'name\' may contain only letters, numbers, underscores and hyphens')
  }
  if (!vendorRegex.test(manifest.vendor)) {
    throw new Error('Field \'vendor\' may contain only letters, numbers, underscores and hyphens')
  }
  if (!versionRegex.test(manifest.version)) {
    throw Error('The version format is invalid')
  }
  return manifest
}
