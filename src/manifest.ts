import { readFile } from 'fs-extra'
import * as path from 'path'
import { memoize } from 'ramda'

import { CommandError } from './errors'

const readFileUtf = async (file: string): Promise<string> => {
  try {
    return await readFile(file, 'utf8')
  } catch (e) {
    throw new CommandError(`Manifest file doesn't exist or is not readable. Please add a manifest.json file in the root of the app folder.`)
  }
}

export const namePattern = '[\\w_-]+'
export const vendorPattern = '[\\w_-]+'
export const versionPattern = '\\d+\\.\\d+\\.\\d+(-.*)?'
export const wildVersionPattern = '\\d+\\.((\\d+\\.\\d+)|(\\d+\\.x)|x)(-.*)?'
export const manifestPath = path.resolve(process.cwd(), 'manifest.json')

export const isManifestReadable = async (): Promise<boolean> => {
  try {
    await readFileUtf(manifestPath)
    return true
  } catch (error) {
    return false
  }
}

export const parseManifest = (content: string): Manifest => {
  try {
    return JSON.parse(content)
  } catch (e) {
    throw new CommandError('Malformed manifest.json file. ' + e)
  }
}

export const validateAppManifest = (manifest: Manifest) => {
  const vendorRegex = new RegExp(`^${vendorPattern}$`)
  const nameRegex = new RegExp(`^${namePattern}$`)
  const versionRegex = new RegExp(`^${versionPattern}$`)
  if (manifest.name === undefined) {
    throw new CommandError('Field \'name\' should be set in manifest.json file')
  }
  if (manifest.version === undefined) {
    throw new CommandError('Field \'version\' should be set in manifest.json file')
  }
  if (manifest.vendor === undefined) {
    throw new CommandError('Field \'vendor\' should be set in manifest.json file')
  }
  if (!nameRegex.test(manifest.name)) {
    throw new CommandError('Field \'name\' may contain only letters, numbers, underscores and hyphens')
  }
  if (!vendorRegex.test(manifest.vendor)) {
    throw new CommandError('Field \'vendor\' may contain only letters, numbers, underscores and hyphens')
  }
  if (!versionRegex.test(manifest.version)) {
    throw new CommandError('The version format is invalid')
  }
}

const appName = new RegExp(`^${vendorPattern}\\.${namePattern}$`)
const appLocator = new RegExp(`^${vendorPattern}\\.${namePattern}(?:@${wildVersionPattern})?$`)

export const validateApp = (app: string, skipVersion: boolean = false) => {
  const regex = skipVersion ? appName : appLocator
  if (!regex.test(app)) {
    throw new CommandError(`Invalid app format, please use <vendor>.<name>${skipVersion ? '' : '[@<version>]'}`)
  }
  return app
}

export const getManifest = memoize(async (): Promise<Manifest> => {
  const manifest = parseManifest(await readFileUtf(manifestPath))
  validateAppManifest(manifest)
  return manifest
})
