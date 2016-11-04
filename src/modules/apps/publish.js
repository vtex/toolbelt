import log from '../../logger'
import {Promise} from 'bluebird'
import {manifest} from '../../manifest'
import {listLocalFiles} from '../../file'
import {startSpinner, setSpinnerText, stopSpinner} from '../../spinner'
import {id, publishApp, mapFileObject} from './utils'

const root = process.cwd()

export default {
  description: 'Publish this app',
  handler: () => {
    log.debug('Starting to publish app')
    setSpinnerText('Publishing app...')
    startSpinner()

    return listLocalFiles(root)
    .tap(files => log.debug('Sending files:', '\n' + files.join('\n')))
    .then(mapFileObject)
    .then(publishApp)
    .finally(() => stopSpinner())
    .then(() => log.info(`Published app ${id} successfully`))
    .catch(err =>
      err.response && err.response.data.code === 'app_version_already_exists'
        ? log.error(`Version ${manifest.version} already published!`)
        : Promise.reject(err)
    )
  },
}
