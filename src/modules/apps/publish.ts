import * as ora from 'ora'
import {resolve} from 'path'
import * as Bluebird from 'bluebird'
import {LoggerInstance} from 'winston'
import {readFileSync} from 'fs-promise'

import log from '../../logger'
import {registry} from '../../clients'
import {id, mapFileObject} from './utils'
import {listLocalFiles} from '../../file'

const ARGS_START_INDEX = 2
const root = process.cwd()

const automaticTag = (version: string): string =>
  version.indexOf('-') > 0 ? null : 'latest'

const publishApp = (path: string, tag: string, manifest: Manifest): Bluebird<LoggerInstance | never> => {
  const spinner = ora('Publishing app...').start()
  return listLocalFiles(path)
    .tap(files => log.debug('Sending files:', '\n' + files.join('\n')))
    .then(files => mapFileObject(files, path))
    .then(files => registry.publishApp(files, tag))
    .finally(() => spinner.stop())
    .then(() => log.info(`Published app ${id(manifest)} successfully`))
    .catch(e => {
      if (e.response && /already published/.test(e.response.data.message)) {
        log.error(e.response.data.message.split('The').join(' -'))
        return Promise.resolve()
      }
      throw e
    })
}

const publishApps = (paths: string[], tag: string, accessor = 0): Bluebird<void | never> => {
  const path = resolve(paths[accessor])
  const manifest = JSON.parse(readFileSync(resolve(path, 'manifest.json'), 'utf8'))
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
  handler: (path: string, options) => {
    log.debug('Starting to publish app')
    const paths = [path || root, ...options._.slice(ARGS_START_INDEX)].map(arg => arg.toString())
    return publishApps(paths, options.tag)
  },
}
