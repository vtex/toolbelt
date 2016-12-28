import log from '../../logger'
import {Promise} from 'bluebird'
import {manifest} from '../../manifest'
import {listLocalFiles} from '../../file'
import {startSpinner, setSpinnerText, stopSpinner} from '../../spinner'
import {id, publishApp, mapFileObject} from './utils'

const root = process.cwd()

function automaticTag (version) {
  return version.indexOf('-') > 0 ? undefined : 'latest'
}

export default {
  description: 'Publish this app',
  options: [
    {
      short: 't',
      long: 'tag',
      description: 'Apply a tag to the release',
      type: 'string',
    },
  ],
  handler: (options) => {
    log.debug('Starting to publish app')
    setSpinnerText('Publishing app...')
    startSpinner()

    return listLocalFiles(root)
    .tap(files => log.debug('Sending files:', '\n' + files.join('\n')))
    .then(mapFileObject)
    .then(files => publishApp(files, options.tag || automaticTag(manifest.version)))
    .finally(() => stopSpinner())
    .then(() => log.info(`Published app ${id} successfully`))
    .catch(err =>
      err.response && err.response.data.code === 'duplicate_publication'
        ? log.error(`Version ${manifest.version} already published!`)
        : Promise.reject(err)
    )
  },
}
