import * as chalk from 'chalk'
import * as Bluebird from 'bluebird'
import * as semverDiff from 'semver-diff'
import {readFile, writeFile} from 'fs-extra'
import * as latestVersion from 'latest-version'
import {
  __,
  map,
  path,
  head,
  tail,
  last,
  prop,
  curry,
  split,
  reduce,
  concat,
  compose,
} from 'ramda'

import log from '../../logger'
import {createClients, router} from '../../clients'
import {
  namePattern,
  manifestPath,
  vendorPattern,
  isManifestReadable,
  wildVersionPattern,
  validateAppManifest,
} from '../../manifest'

import {RegistryAppVersionsListItem} from '@vtex/api'

const ARGS_START_INDEX = 2
const unprefixName = compose<string, string[], string>(last, split(':'))
const wildVersionByMajor = compose<string, string[], string, string>(concat(__, '.x'), head, split('.'))
const invalidAppMessage =
  'Invalid app format, please use <vendor>.<name>, <vendor>.<name>@<version>, npm:<name> or npm:<name>@<version>'

class InterruptionException extends Error {}

const readManifest = (): Bluebird<Manifest | never> => {
  const isReadable = isManifestReadable()
  if (!isReadable) {
    return Promise.reject(new InterruptionException('Couldn\'t read manifest file'))
  }
  return readFile(manifestPath, 'utf8')
    .then(JSON.parse)
    .then(validateAppManifest)
}

const extractVersionFromId =
  compose<VersionByApp, string, string[], string>(last, split('@'), prop('versionIdentifier'))

const pickLatestVersion = (versions: string[]): string => {
  const start = head(versions)
  return reduce((acc: string, version: string) => {
    return semverDiff(acc, version) ? version : acc
  }, start, tail(versions))
}

const handleError = curry((app: string, err: any) => {
  if (err.response && err.response.status === 404) {
    return Promise.reject(new InterruptionException(`App ${chalk.green(app)} not found`))
  }
  return Promise.reject(err)
})

const appsLatestVersion = (app: string): Bluebird<string | never> => {
  return createClients({account: 'smartcheckout'}).registry
    .listVersionsByApp(app)
    .then<RegistryAppVersionsListItem[]>(prop('data'))
    .then(map(extractVersionFromId))
    .then(pickLatestVersion)
    .then(wildVersionByMajor)
    .catch(handleError(app))
}

const infraLatestVersion = (app: string): Bluebird<string | never> =>
  router.getAvailableVersions(app)
    .then<string[]>(path(['versions', 'aws-us-east-1']))
    .then(pickLatestVersion)
    .then(wildVersionByMajor)
    .catch(handleError(app))

const npmLatestVersion = (app: string): Bluebird<string | never> => {
  return latestVersion(app)
    .then(concat('^'))
    .catch(err => Promise.reject(new InterruptionException(err.message)))
}

const updateManifestDependencies = (app: string, version: string): Bluebird<void> => {
  return readManifest()
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
    .then((manifestJson: string) => writeFile(manifestPath, manifestJson))
}

const addApp = (app: string): Bluebird<void> => {
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
    : appsLatestVersion(appName)
  return versionRequest
    .then((version: string) => updateManifestDependencies(app, version))
}

const addApps = (apps: string[]): Bluebird<void | never> => {
  const app = head(apps)
  const decApps = tail(apps)
  log.debug('Starting to add app', app)
  const appRegex = new RegExp(`^(${vendorPattern}\\.|(npm|infra):)${namePattern}(@${wildVersionPattern})?$`)
  const appPromise = appRegex.test(app)
    ? addApp(app)
    : Promise.reject(new InterruptionException(invalidAppMessage))
  return appPromise
    .then(() => decApps.length > 0 ? addApps(decApps) : Promise.resolve())
    .catch(err => {
      // A warn message will display the workspaces not deleted.
      if (!err.toolbeltWarning) {
        log.warn(`The following app(s) were not added: ${apps.join(', ')}`)
        // the warn message is only displayed the first time the err occurs.
        err.toolbeltWarning = true
      }
      return Promise.reject(err)
    })
}

export default (app: string, options) => {
  const apps = [app, ...options._.slice(ARGS_START_INDEX)].map(arg => arg.toString())
  log.debug('Adding app(s)', apps)
  return addApps(apps)
    .then(() => log.info('App(s) added succesfully!'))
    .catch(err => {
      if (err instanceof InterruptionException) {
        log.error(err.message)
        return Promise.resolve()
      }
      return Promise.reject(err)
    })
}
