import { accessSync } from 'fs'
import { readFile } from 'fs-extra'
import * as path from 'path'
import { memoize } from 'ramda'

import { CommandError } from './errors'

const readFileUtf = async (file: string): Promise<string> => {
  return await readFile(file, 'utf8')
}

export const MANIFEST_FILE_NAME = 'manifest.json'

export const getAppRoot = () => {
  const cwd = process.cwd()
  const { root: rootDirName } = path.parse(cwd)

  const find = dir => {
    try {
      accessSync(path.join(dir, MANIFEST_FILE_NAME))
      return dir
    } catch (e) {
      if (dir === rootDirName) {
        throw new CommandError(
          `Manifest file doesn't exist or is not readable. Please make sure you're in the app's directory or add a manifest.json file in the root folder of the app.`
        )
      }

      return find(path.resolve(dir, '..'))
    }
  }

  return find(cwd)
}

export const namePattern = '[\\w_-]+'
export const vendorPattern = '[\\w_-]+'
export const versionPattern = '\\d+\\.\\d+\\.\\d+(-.*)?'
export const wildVersionPattern = '\\d+\\.((\\d+\\.\\d+)|(\\d+\\.x)|x)(-.*)?'
export const getManifestPath = () => path.resolve(getAppRoot(), MANIFEST_FILE_NAME)

export const isManifestReadable = async (): Promise<boolean> => {
  try {
    await readFileUtf(getManifestPath())
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

export const validateAppManifest = (manifest: any) => {
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
  const manifest = parseManifest(await readFileUtf(getManifestPath()))
  validateAppManifest(manifest)
  return manifest
})
