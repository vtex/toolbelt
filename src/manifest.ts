import {pipe} from 'ramda'
import * as path from 'path'
import {readFileSync, accessSync, constants} from 'fs-extra'

import log from './logger'
import {CommandError} from './errors'

const readFileSyncUtf = (file: string): string =>
  readFileSync(file, 'utf8')

export const namePattern = '[\\w_-]+'
export const vendorPattern = '[\\w_-]+'
export const versionPattern = '\\d+\\.\\d+\\.\\d+(-.*)?'
export const wildVersionPattern = '\\d+\\.((\\d+\\.\\d+)|(\\d+\\.x)|x)(-.*)?'
export const manifestPath = path.resolve(process.cwd(), 'manifest.json')

export const isManifestReadable = (): boolean => {
  try {
    accessSync(manifestPath, constants.R_OK) // Throws if check fails
    return true
  } catch (e) {
    log.debug('manifest.json doesn\'t exist or is not readable')
    return false
  }
}

export const validateAppManifest = (manifest: Manifest): Manifest => {
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

const appName = new RegExp(`^${vendorPattern}\\.${namePattern}$`)
const appLocator = new RegExp(`^${vendorPattern}\\.${namePattern}@.+$`)

export const validateApp = (app: string, skipVersion: boolean = false) => {
  const regex = skipVersion ? appName : appLocator
  if (!regex.test(app)) {
    throw new CommandError(`Invalid app format, please use <vendor>.<name>${skipVersion ? '' : '[@<version>]'}`)
  }
  return app
}

export const manifest = isManifestReadable()
  ? pipe<string, string, Manifest, Manifest>(readFileSyncUtf, JSON.parse, validateAppManifest)(manifestPath)
  : {name: '', vendor: '', version: ''}
