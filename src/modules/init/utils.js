import {writeFile} from 'fs'
import {promisify} from 'bluebird'
import {manifestPath} from '../../manifest'

const bbWriteFile = promisify(writeFile)

export function writeManifest (manifest) {
  return bbWriteFile(manifestPath, JSON.stringify(manifest, null, 2))
}
