import chalk from 'chalk'
import { router } from '../../clients'
import { region } from '../../env'
import { CommandError } from '../../errors'
import { ManifestEditor, ManifestValidator } from '../../lib/manifest'
import log from '../../logger'
import { appLatestMajor, parseArgs, pickLatestVersion, wildVersionByMajor } from './utils'

const unprefixName = (str: string) => {
  return str.split(':').pop()
}

const invalidAppMessage = 'Invalid app format, please use <vendor>.<name>, <vendor>.<name>@<version>'

const infraLatestVersion = async (app: string) => {
  try {
    const { versions } = await router.getAvailableVersions(app)
    const latest = pickLatestVersion(versions[region()])
    return wildVersionByMajor(latest)
  } catch (err) {
    if (err.response && err.response.status === 404) {
      throw new CommandError(`App ${chalk.green(app)} not found`)
    }

    throw err
  }
}

const addApp = async (app: string, manifest: ManifestEditor) => {
  const hasVersion = app.indexOf('@') > -1
  if (hasVersion) {
    const [appId, version] = app.split('@')
    return manifest.addDependency(appId, version)
  }

  const isInfra = app.startsWith('infra:')
  const appName = app.includes(':') ? unprefixName(app) : app
  const version = await (isInfra ? infraLatestVersion(appName) : appLatestMajor(appName))

  return manifest.addDependency(app, version)
}

const addApps = async (apps: string[], manifest: ManifestEditor) => {
  try {
    for (let i = 0; i < apps.length; i += 1) {
      const app = apps[i]
      log.debug('Starting to add app', app)

      if (!ManifestValidator.dependencyName.test(app)) {
        throw new CommandError(invalidAppMessage)
      }
      await addApp(app, manifest)
    }
  } catch (err) {
    log.warn(`The following app` + (apps.length > 1 ? 's were' : ' was') + ` not added: ${apps.join(', ')}`)
    throw err
  }
}

export default async (app: string, options) => {
  const apps = [app, ...parseArgs(options._)]
  const manifest = new ManifestEditor()
  log.debug('Adding app' + (apps.length > 1 ? 's' : '') + `: ${apps.join(', ')}`)
  try {
    await addApps(apps, manifest)
    log.info('App' + (apps.length > 1 ? 's' : '') + ' added succesfully!')
  } catch (err) {
    if (err instanceof CommandError) {
      log.error(err.message)
      return
    }

    throw err
  }
}
