import {resolve} from 'path'
import {readFileSync} from 'fs'
import log from '../../logger'
import {Promise} from 'bluebird'
import {listLocalFiles} from '../../file'
import {startSpinner, setSpinnerText, stopSpinner} from '../../spinner'
import {registry} from '../../clients'
import {id, mapFileObject} from './utils'

const ARGS_START_INDEX = 2
const root = process.cwd()

function automaticTag (version) {
  return version.indexOf('-') > 0 ? undefined : 'latest'
}

function publishApp (path, tag, manifest) {
  setSpinnerText('Publishing app...')
  startSpinner()

  return listLocalFiles(path)
  .tap(files => log.debug('Sending files:', '\n' + files.join('\n')))
  .then(files => mapFileObject(files, path))
  .then(files => registry.publishApp(files, tag))
  .finally(() => stopSpinner())
  .then(() => log.info(`Published app ${id(manifest)} successfully`))
}

function publishApps (paths, tag, accessor = 0) {
  const path = resolve(paths[accessor])
  const manifest = JSON.parse(readFileSync(resolve(path, 'manifest.json')))
  const next = () => accessor < paths.length - 1
    ? publishApps(paths, tag, accessor + 1)
    : Promise.resolve()
  return publishApp(path, tag || automaticTag(manifest.version), manifest).then(next)
}

export default {
  description: 'Publish the current app or a path containing an app',
  optionalArgs: 'path',
  options: [
    {
      short: 't',
      long: 'tag',
      description: 'Apply a tag to the release',
      type: 'string',
    },
  ],
  handler: (path, options) => {
    log.debug('Starting to publish app')
    const paths = [path || root, ...options._.slice(ARGS_START_INDEX)]
    return publishApps(paths, options.tag)
  },
}
