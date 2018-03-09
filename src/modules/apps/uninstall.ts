import * as inquirer from 'inquirer'
import {head, prepend, tail} from 'ramda'

import {apps} from '../../clients'
import log from '../../logger'
import {getManifest, validateApp} from '../../manifest'
import {toAppLocator} from './../../locator'
import {parseArgs, validateAppAction} from './utils'

const {uninstallApp} = apps

const promptAppUninstall = (appsList: string[]): Promise<void> =>
  inquirer.prompt({
    message: `Are you sure you want to uninstall ${appsList.join(', ')}?`,
    name: 'confirm',
    type: 'confirm',
  })
  .then(({confirm}) => {
    if (!confirm) {
      process.exit()
    }
  })

const uninstallApps = async (appsList: string[]): Promise<void> => {
  if (appsList.length === 0) {
    return
  }
  const app = validateApp(head(appsList).split('@')[0], true)
  try {
    log.debug('Starting to uninstall app', app)
    await uninstallApp(app)
    log.info(`Uninstalled app ${app} successfully`)
  } catch (e) {
    log.warn(`The following app was not uninstalled: ${app}`)
    log.error(`${e.response.status}: ${e.response.statusText}. ${e.response.data.message}`)
  }
  await uninstallApps(tail(appsList))
}

export default async (optionalApp: string, options) => {
  await validateAppAction(optionalApp)
  const app = optionalApp || toAppLocator(await getManifest())
  const appsList = prepend(app, parseArgs(options._))
  const preConfirm = options.y || options.yes

  if (!preConfirm) {
    await promptAppUninstall(appsList)
  }

  log.debug('Uninstalling app' + (appsList.length > 1 ? 's' : '') + `: ${appsList.join(', ')}`)
  return uninstallApps(appsList)
}
