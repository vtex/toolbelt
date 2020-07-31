import { accessSync } from 'fs'
import path from 'path'
import { ErrorKinds } from '../error/ErrorKinds'
import { ErrorReport } from '../error/ErrorReport'

export const MANIFEST_FILE_NAME = 'manifest.json'

export const getAppRoot = () => {
  const cwd = process.cwd()
  const { root: rootDirName } = path.parse(cwd)

  const find = dir => {
    try {
      accessSync(path.join(dir, MANIFEST_FILE_NAME))
      return dir
    } catch (err) {
      if (dir === rootDirName) {
        throw ErrorReport.createAndMaybeRegisterOnTelemetry({
          kind: ErrorKinds.FLOW_ISSUE_ERROR,
          originalError: new Error(
            "Manifest file doesn't exist or is not readable. Please make sure you're in the app's directory or add a manifest.json file in the root folder of the app."
          ),
        })
      }

      return find(path.resolve(dir, '..'))
    }
  }

  return find(cwd)
}
