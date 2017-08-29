import * as inquirer from 'inquirer'
import {head, tail} from 'ramda'

import log from '../../logger'
import {apps} from '../../clients'
import {validateAppAction} from './utils'
import {getManifest, validateApp} from '../../manifest'
import {toAppLocator} from './../../locator'

const {uninstallApp} = apps
const ARGS_START_INDEX = 1

const promptAppUninstall = (apps: string[]): Promise<void> =>
  inquirer.prompt({
    type: 'confirm',
    name: 'confirm',
    message: `Are you sure you want to uninstall ${apps.join(', ')}?`,
  })
  .then(({confirm}) => {
    if (!confirm) {
      process.exit()
    }
  })

const uninstallApps = async (apps: string[]): Promise<void> => {
  if (apps.length === 0) {
    return
  }
  const app = validateApp(head(apps).split('@')[0], true)
  try {
    log.debug('Starting to uninstall app', app)
    await uninstallApp(app)
    log.info(`Uninstalled app ${app} successfully`)
  } catch (e) {
    log.warn(`The following app was not uninstalled: ${app}`)
    log.error(`${e.response.status}: ${e.response.statusText}. ${e.response.data.message}`)
  }
  await uninstallApps(tail(apps))
}

export default async (optionalApp: string, options) => {
  await validateAppAction(optionalApp)
  const app = optionalApp || toAppLocator(await getManifest())
  const apps = [app, ...options._.slice(ARGS_START_INDEX)].map(arg => arg.toString())
  const preConfirm = options.y || options.yes

  if (!preConfirm) {
    await promptAppUninstall(apps)
  }

  log.debug(`Uninstalling app(s): ${apps.join(', ')}`)
  return uninstallApps(apps)
}
