import {join} from 'path'
import log from '../../logger'
import {mkdir, readFile} from 'fs'
import {promisify} from 'bluebird'
import {writeManifest} from './utils'
import {manifestPath} from '../../manifest'

const bbMkdir = promisify(mkdir)
const bbReadFile = promisify(readFile)

function addRenderDeps (manifest) {
  return {
    ...manifest,
    dependencies: {
      ...manifest.dependencies,
      'vtex.renderjs': '0.x',
      'vtex.placeholder': '0.x',
      'npm:react': '15.1.0',
    },
  }
}

function readManifest () {
  return bbReadFile(manifestPath).then(JSON.parse)
}

export default {
  description: 'Create a new render bootstrap project',
  handler: () => {
    log.debug('Reading manifest file')
    return readManifest()
    .tap(() =>
      log.debug('Adding render deps to manifest and creating render folder')
    )
    .then(manifest =>
      Promise.all([
        writeManifest(addRenderDeps(manifest)),
        bbMkdir(join(process.cwd(), 'render')),
      ])
    )
    .catch(err =>
      err && err.code === 'ENOENT'
        ? log.error('Manifest file not found.')
        : Promise.reject(err)
    )
  },
}
