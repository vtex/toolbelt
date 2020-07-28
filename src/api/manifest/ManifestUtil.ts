import { accessSync } from 'fs'
import path from 'path'
import { CommandError } from '../error'

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
          "Manifest file doesn't exist or is not readable. Please make sure you're in the app's directory or add a manifest.json file in the root folder of the app."
        )
      }

      return find(path.resolve(dir, '..'))
    }
  }

  return find(cwd)
}
