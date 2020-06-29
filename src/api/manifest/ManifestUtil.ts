import { accessSync } from 'fs'
import { readFile, writeFile } from 'fs-extra'
import path from 'path'
import { memoize } from 'ramda'

import { CommandError } from '../error/errors'

const readFileUtf = (file: string): Promise<string> => {
  return readFile(file, 'utf8')
}

const MANIFEST_SCHEMA = 'https://raw.githubusercontent.com/vtex/node-vtex-api/master/gen/manifest.schema'

export const MANIFEST_FILE_NAME = 'manifest.json'

export const getAppRoot = () => {
  if (process.env.OCLIF_COMPILATION) {
    return ''
  }

  const cwd = process.cwd()
  const { root: rootDirName } = path.parse(cwd)

  const find = dir => {
    try {
      accessSync(path.join(dir, MANIFEST_FILE_NAME))
      return dir
    } catch (e) {
      if (dir === rootDirName) {
        throw new CommandError(
          "Manifest file doesn't exist or is not readable. Please make sure you're in the app's directory or add a manifest.json file in the root folder of the app."
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

export const parseManifest = (content: string): Manifest => {
  try {
    return JSON.parse(content)
  } catch (e) {
    throw new CommandError(`Malformed manifest.json file. ${e}`)
  }
}

export const validateAppManifest = (manifest: any) => {
  const vendorRegex = new RegExp(`^${vendorPattern}$`)
  const nameRegex = new RegExp(`^${namePattern}$`)
  const versionRegex = new RegExp(`^${versionPattern}$`)
  if (manifest.name === undefined) {
    throw new CommandError("Field 'name' should be set in manifest.json file")
  }
  if (manifest.version === undefined) {
    throw new CommandError("Field 'version' should be set in manifest.json file")
  }
  if (manifest.vendor === undefined) {
    throw new CommandError("Field 'vendor' should be set in manifest.json file")
  }
  if (!nameRegex.test(manifest.name)) {
    throw new CommandError("Field 'name' may contain only letters, numbers, underscores and hyphens")
  }
  if (!vendorRegex.test(manifest.vendor)) {
    throw new CommandError("Field 'vendor' may contain only letters, numbers, underscores and hyphens")
  }
  if (!versionRegex.test(manifest.version)) {
    throw new CommandError('The version format is invalid')
  }
}

export const getManifest = memoize(
  async (): Promise<Manifest> => {
    const manifest = parseManifest(await readFileUtf(getManifestPath()))
    validateAppManifest(manifest)
    return manifest
  }
)

export const writeManifestSchema = async () => {
  const content = await readFileUtf(getManifestPath())
  const json = JSON.parse(content)
  if (!json.$schema || json.$schema !== MANIFEST_SCHEMA) {
    json.$schema = MANIFEST_SCHEMA
    writeFile(getManifestPath(), JSON.stringify(json, null, 2))
  }
}
