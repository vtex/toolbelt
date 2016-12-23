import fs from 'fs'
import path from 'path'
import {pipe} from 'ramda'
import log from './logger'

export const vendorPattern = '[\\w_-]+'

export const namePattern = '[\\w_-]+'

export const versionPattern = '\\d+\\.\\d+\\.\\d+(-.*)?'

export const manifestPath = path.resolve(process.cwd(), 'manifest.json')

const R_OK = fs.constants ? fs.constants.R_OK : fs.R_OK // Node v6 breaking change

export const isManifestReadable = () => {
  try {
    fs.accessSync(manifestPath, R_OK) // Throws if check fails
    return true
  } catch (e) {
    log.debug('manifest.json doesn\'t exist or is not readable')
    return false
  }
}

export const manifest = isManifestReadable()
  ? pipe(fs.readFileSync, JSON.parse, validateAppManifest)(manifestPath)
  : {}

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
