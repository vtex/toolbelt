import { accessSync } from 'fs'
import path from 'path'
import { ErrorReport, ErrorKinds } from '../error'

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
        ErrorReport.createAndMaybeRegisterOnTelemetry({
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
<<<<<<< HEAD
=======

export const namePattern = '[\\w_-]+'
export const vendorPattern = '[\\w_-]+'
export const versionPattern = '\\d+\\.\\d+\\.\\d+(-.*)?'
export const wildVersionPattern = '\\d+\\.((\\d+\\.\\d+)|(\\d+\\.x)|x)(-.*)?'
export const getManifestPath = () => path.resolve(getAppRoot(), MANIFEST_FILE_NAME)

export const parseManifest = (content: string): Manifest => {
  try {
    return JSON.parse(content)
  } catch (e) {
    ErrorReport.createAndMaybeRegisterOnTelemetry({
      kind: ErrorKinds.FLOW_ISSUE_ERROR,
      originalError: new Error(`Malformed manifest.json file. ${e}`),
    })
  }
}

export const validateAppManifest = (manifest: any) => {
  const vendorRegex = new RegExp(`^${vendorPattern}$`)
  const nameRegex = new RegExp(`^${namePattern}$`)
  const versionRegex = new RegExp(`^${versionPattern}$`)
  if (manifest.name === undefined) {
    ErrorReport.createAndMaybeRegisterOnTelemetry({
      kind: ErrorKinds.FLOW_ISSUE_ERROR,
      originalError: new Error("Field 'name' should be set in manifest.json file"),
    })
  }
  if (manifest.version === undefined) {
    ErrorReport.createAndMaybeRegisterOnTelemetry({
      kind: ErrorKinds.FLOW_ISSUE_ERROR,
      originalError: new Error("Field 'version' should be set in manifest.json file"),
    })
  }
  if (manifest.vendor === undefined) {
    ErrorReport.createAndMaybeRegisterOnTelemetry({
      kind: ErrorKinds.FLOW_ISSUE_ERROR,
      originalError: new Error("Field 'vendor' should be set in manifest.json file"),
    })
  }
  if (!nameRegex.test(manifest.name)) {
    ErrorReport.createAndMaybeRegisterOnTelemetry({
      kind: ErrorKinds.FLOW_ISSUE_ERROR,
      originalError: new Error("Field 'name' may contain only letters, numbers, underscores and hyphens"),
    })
  }
  if (!vendorRegex.test(manifest.vendor)) {
    ErrorReport.createAndMaybeRegisterOnTelemetry({
      kind: ErrorKinds.FLOW_ISSUE_ERROR,
      originalError: new Error("Field 'vendor' may contain only letters, numbers, underscores and hyphens"),
    })
  }
  if (!versionRegex.test(manifest.version)) {
    ErrorReport.createAndMaybeRegisterOnTelemetry({
      kind: ErrorKinds.FLOW_ISSUE_ERROR,
      originalError: new Error('The version format is invalid'),
    })
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
>>>>>>> MifestUtil commandError
