import log from '../../logger'
import inquirer from 'inquirer'
import {getWorkspace, getAccount} from '../../conf'
import {vendorPattern, namePattern} from '../../manifest'
import {workspaceMasterMessage, appsClient} from './utils'

const promptAppUninstall = (app) => {
  return inquirer.prompt({
    type: 'confirm',
    name: 'confirm',
    message: `Are you sure you want to uninstall the app ${app}?`,
  })
  .then(({confirm}) => confirm)
}

export default {
  requiredArgs: 'app',
  description: 'Uninstall the specified app',
  options: [
    {
      short: 'y',
      long: 'yes',
      description: 'Auto confirm prompts',
      type: 'boolean',
    },
  ],
  handler: (app, options) => {
    const workspace = getWorkspace()
    if (workspace === 'master') {
      log.error(workspaceMasterMessage)
      return Promise.resolve()
    }

    log.debug('Starting to uninstall app', app)
    const appRegex = new RegExp(`^${vendorPattern}\.${namePattern}$`)
    if (!appRegex.test(app)) {
      log.error('Invalid app format, please use <vendor>.<name>')
      return Promise.resolve()
    }

    const preConfirm = options.y || options.yes
    return Promise.try(() => preConfirm || promptAppUninstall(app))
    .then(confirm => confirm || Promise.reject('User cancelled'))
    .then(() =>
      appsClient().uninstallApp(
        getAccount(),
        getWorkspace(),
        app
      )
    )
    .then(() => log.info(`Uninstalled app ${app} successfully`))
    .catch(err => {
      if (err.statusCode === 409) {
        return log.error(`App ${app} not installed`)
      }
      return Promise.reject(err)
    })
  },
}
