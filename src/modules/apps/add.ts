import { writeFile } from 'fs-extra'
import * as latestVersion from 'latest-version'
import {
  compose,
  concat,
  head,
  last,
  path,
  prepend,
  split,
  tail,
} from 'ramda'

import { router } from '../../clients'
import { region } from '../../env'
import { CommandError } from '../../errors'
import log from '../../logger'
import {
  getManifest,
  getManifestPath,
  namePattern,
  vendorPattern,
  wildVersionPattern,
} from '../../manifest'

import { appLatestMajor, handleError, parseArgs, pickLatestVersion, wildVersionByMajor } from './utils'

const unprefixName = compose<string, string[], string>(last, split(':'))
const invalidAppMessage =
  'Invalid app format, please use <vendor>.<name>, <vendor>.<name>@<version>, npm:<name> or npm:<name>@<version>'

const infraLatestVersion = (app: string): Promise<string | never> =>
  router.getAvailableVersions(app)
    .then<string[]>(path(['versions', region()]))
    .then(pickLatestVersion)
    .then(wildVersionByMajor)
    .catch(handleError(app))

const npmLatestVersion = (app: string): Promise<string | never> => {
  return latestVersion(app)
    .then(concat('^'))
    .catch(err => Promise.reject(new CommandError(err.message)))
}

const updateManifestDependencies = (app: string, version: string): Promise<void> => {
  return getManifest()
    .then((manifest: Manifest) => {
      return {
        ...manifest,
        dependencies: {
          ...manifest.dependencies,
          [app]: version,
        },
      }
    })
    .then((newManifest: Manifest) => JSON.stringify(newManifest, null, 2) + '\n')
    .then((manifestJson: string) => writeFile(getManifestPath(), manifestJson))
}

const addApp = (app: string): Promise<void> => {
  const hasVersion = app.indexOf('@') > -1
  if (hasVersion) {
    const [appId, version] = app.split('@')
    return updateManifestDependencies(appId, version)
  }
  const isNpm = app.startsWith('npm:')
  const isInfra = app.startsWith('infra:')
  const appName = app.includes(':') ? unprefixName(app) : app
  const versionRequest = isNpm ? npmLatestVersion(appName)
    : isInfra ? infraLatestVersion(appName)
      : appLatestMajor(appName)
  return versionRequest
    .then((version: string) => updateManifestDependencies(app, version))
}

const addApps = (apps: string[]): Promise<void | never> => {
  const app = head(apps)
  const decApps = tail(apps)
  log.debug('Starting to add app', app)
  const appRegex = new RegExp(`^(${vendorPattern}\\.|(npm|infra):)${namePattern}(@${wildVersionPattern})?$`)
  const appPromise = appRegex.test(app)
    ? addApp(app)
    : Promise.reject(new CommandError(invalidAppMessage))
  return appPromise
    .then(() => decApps.length > 0 ? addApps(decApps) : Promise.resolve())
    .catch(err => {
      // A warn message will display the workspaces not deleted.
      if (!err.toolbeltWarning) {
        log.warn(`The following app` + (apps.length > 1 ? 's were' : ' was') + ` not added: ${apps.join(', ')}`)
        // the warn message is only displayed the first time the err occurs.
        err.toolbeltWarning = true
      }
      return Promise.reject(err)
    })
}

export default (app: string, options) => {
  const apps = prepend(app, parseArgs(options._))
  log.debug('Adding app' + (apps.length > 1 ? 's' : '') + `: ${apps.join(', ')}`)
  return addApps(apps)
    .then(() => log.info('App' + (apps.length > 1 ? 's' : '') + ' added succesfully!'))
    .catch(err => {
      if (err instanceof CommandError) {
        log.error(err.message)
        return Promise.resolve()
      }
      return Promise.reject(err)
    })
}
