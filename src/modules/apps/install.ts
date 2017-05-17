import {head, tail} from 'ramda'

import {CommandError} from '../../errors'
import log from '../../logger'
import {apps} from '../../clients'
import {getWorkspace} from '../../conf'
import {workspaceMasterMessage} from './utils'
import {manifest, validateApp, isManifestReadable} from '../../manifest'

const {installApp} = apps
const ARGS_START_INDEX = 2

const installApps = async (apps: string[], reg: string): Promise<void> => {
  if (apps.length === 0) {
    return
  }
  const app = validateApp(head(apps))
  try {
    log.debug('Starting to install app', app)
    await installApp(app, reg)
  } catch (e) {
    log.warn(`The following apps were not installed: ${apps.join(', ')}`)
    throw e
  }
  log.info(`Installed app ${app} successfully`)
  await installApps(tail(apps), reg)
}

export default {
  optionalArgs: 'app',
  description: 'Install an app on the current directory or a specified one',
  options: [
    {
      short: 'r',
      long: 'registry',
      description: 'Specify the registry for the app',
      type: 'string',
    },
  ],
  handler: (optionalApp: string, options) => {
    const workspace = getWorkspace()
    if (workspace === 'master') {
      throw new CommandError(workspaceMasterMessage)
    }

    // No app arguments and no manifest file.
    if (!optionalApp && !isManifestReadable()) {
      throw new CommandError('No app was found, please fix the manifest.json or use <vendor>.<name>[@<version>]')
    }

    const app = optionalApp || `${manifest.vendor}.${manifest.name}@${manifest.version}`
    const apps = [app, ...options._.slice(ARGS_START_INDEX)].map(arg => arg.toString())
    log.debug('Installing app(s)', apps)
    return installApps(apps, options.r || options.registry || 'smartcheckout')
  },
}
