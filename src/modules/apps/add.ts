import chalk from 'chalk'
import { region } from '../../env'
import { CommandError } from '../../errors'
import { ManifestEditor, ManifestValidator } from '../../lib/manifest'
import log from '../../logger'
import { appLatestMajor, pickLatestVersion, wildVersionByMajor } from './utils'
import { createRouterClient } from '../../lib/clients/IOClients/infra/Router'

const unprefixName = (str: string) => {
  return str.split(':').pop()
}

const invalidAppMessage = 'Invalid app format, please use <vendor>.<name>, <vendor>.<name>@<version>'

const infraLatestVersion = async (app: string) => {
  try {
    const router = createRouterClient()
    const { versions } = await router.getAvailableVersions(app)
    const latest = pickLatestVersion(versions[region()])
    return wildVersionByMajor(latest)
  } catch (err) {
    if (err.response?.status === 404) {
      throw new CommandError(`App ${chalk.green(`infra:${app}`)} not found`)
    }

    throw err
  }
}

const getVersion = (appName: string) => {
  const isInfra = appName.startsWith('infra:')
  const name = appName.includes(':') ? unprefixName(appName) : appName
  return isInfra ? infraLatestVersion(name) : appLatestMajor(name)
}

const addApp = async (app: string, manifest: ManifestEditor) => {
  const [appName, version] = app.split('@')
  const sanitizedVersion = version ?? (await getVersion(appName))
  await manifest.addDependency(appName, sanitizedVersion)
  log.info(`Added ${chalk.green(`${appName}@${sanitizedVersion}`)}`)
}

const addApps = async (apps: string[], manifest: ManifestEditor) => {
  try {
    for (const app of apps) {
      log.debug('Starting to add app', app)

      if (!ManifestValidator.dependencyName.test(app)) {
        throw new CommandError(invalidAppMessage)
      }
      // eslint-disable-next-line no-await-in-loop
      await addApp(app, manifest)
    }
  } catch (err) {
    log.warn(`The following app${apps.length > 1 ? 's were' : ' was'} not added: ${apps.join(', ')}`)
    throw err
  }
}

export default async (apps: string[]) => {
  const manifest = await ManifestEditor.getManifestEditor()
  log.debug(`Adding app${apps.length > 1 ? 's' : ''}: ${apps.join(', ')}`)
  try {
    await addApps(apps, manifest)
  } catch (err) {
    if (err instanceof CommandError) {
      log.error(err.message)
      return
    }

    throw err
  }
}
