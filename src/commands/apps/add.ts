import { flags } from '@oclif/command'
import chalk from 'chalk'

import { router } from '../../clients'
import { region } from '../../env'
import { CommandError } from '../../errors'
import { ManifestEditor, ManifestValidator } from '../../lib/manifest'
import log from '../../logger'
import { CustomCommand } from '../../lib/CustomCommand'
import { pickLatestVersion, wildVersionByMajor, appLatestMajor } from '../../lib/apps/utils'

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

export default class Add extends CustomCommand {

  static description = 'Add app(s) to the manifest dependencies'

  static examples = []

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  static args = [{ name: 'appId', required: true }]

  async run() {
    const { args } = this.parse(Add)

    const apps = [args.appId]
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
}
