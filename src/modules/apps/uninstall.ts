import * as inquirer from 'inquirer'
import {head, tail} from 'ramda'

import log from '../../logger'
import {apps} from '../../clients'
import {validateAppAction} from './utils'
import {listenBuild} from '../utils'
import {manifest, validateApp} from '../../manifest'

const {uninstallApp} = apps
const ARGS_START_INDEX = 2

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
  const app = validateApp(head(apps), true)
  try {
    log.debug('Starting to uninstall app', app)
    await uninstallApp(app)
  } catch (e) {
    log.warn(`The following apps were not uninstalled: ${apps.join(', ')}`)
    throw e
  }
  log.info(`Uninstalled app ${app} successfully`)
  await uninstallApps(tail(apps))
}

export default async (optionalApp: string, options) => {
  await validateAppAction(optionalApp)
  const app = optionalApp || `${manifest.vendor}.${manifest.name}`
  const apps = [app, ...options._.slice(ARGS_START_INDEX)].map(arg => arg.toString())
  const preConfirm = options.y || options.yes

  if (!preConfirm) {
    await promptAppUninstall(apps)
  }

  const doUninstall = () => uninstallApps(apps)
  log.debug('Uninstalling app(s)', apps)
  // Only listen for feedback if there's only one app
  return apps.length === 1
    ? listenBuild(app, doUninstall)
    : doUninstall()
}
