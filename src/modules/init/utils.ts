import * as Bluebird from 'bluebird'
import {writeFile} from 'fs-extra'

import {manifestPath} from '../../manifest'

export const writeManifest = (manifest: Manifest): Bluebird<void> =>
  writeFile(manifestPath, JSON.stringify(manifest, null, 2))
