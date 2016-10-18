import log from '../../logger'
import {getWorkspace} from '../../conf'
import {workspaceMasterMessage, installApp} from './utils'
import {
  manifest,
  namePattern,
  vendorPattern,
  wildVersionPattern,
} from '../../manifest'

export default {
  optionalArgs: 'app',
  description: 'Install an app on the current directory or a specified one',
  handler: (optionalApp) => {
    const workspace = getWorkspace()
    if (workspace === 'master') {
      log.error(workspaceMasterMessage)
      return Promise.resolve()
    }

    const app = typeof optionalApp === 'string'
      ? optionalApp
      : `${manifest.vendor}.${manifest.name}@${manifest.version}`
    log.debug('Starting to install app', app)
    const appRegex = new RegExp(`^${vendorPattern}.${namePattern}@${wildVersionPattern}$`)
    if (!appRegex.test(app)) {
      log.error('Invalid app format, please use <vendor>.<name>@<version>')
      return Promise.resolve()
    }

    return installApp(app)
    .then(() => log.info(`Installed app ${app} successfully`))
    .catch(err => {
      if (err.statusCode === 409) {
        return log.error(`App ${app} already installed`)
      }
      return Promise.reject(err)
    })
  },
}
