import chalk from 'chalk'
import log from '../../logger'
import semverDiff from 'semver-diff'
import {readFile, writeFile} from 'fs'
import {registry} from '../../clients'
import latestVersion from 'latest-version'
import {Promise, promisify} from 'bluebird'
import {getAccount, getWorkspace} from '../../conf'
import {head, tail, last, reduce, prop, split, compose, concat, __} from 'ramda'
import {
  namePattern,
  manifestPath,
  vendorPattern,
  isManifestReadable,
  wildVersionPattern,
  validateAppManifest,
} from '../../manifest'

const ARGS_START_INDEX = 2
const bbReadFile = promisify(readFile)
const bbWriteFile = promisify(writeFile)
const npmName = compose(last, split(':'))
const wildVersionByMajor = compose(concat(__, '.x'), head, split('.'))
const invalidAppMessage = 'Invalid app format, please use <vendor>.<name>, <vendor>.<name>@<version>, npm:<name> or npm:<name>@<version>'

class InterruptionException extends Error {}

function readManifest () {
  const isReadable = isManifestReadable()
  if (!isReadable) {
    return Promise.reject(new InterruptionException('Couldn\'t read manifest file'))
  }
  return bbReadFile(manifestPath)
  .then(JSON.parse)
  .then(validateAppManifest)
}

function pickLatestVersion (versions) {
  const start = prop('version', head(versions))
  return reduce((acc, {version}) => {
    return semverDiff(acc, version) ? version : acc
  }, start, tail(versions))
}

function appsLatestVersion (app) {
  const [vendor, name] = app.split('.')
  return registry()
  .listVersionsByApp(getAccount(), getWorkspace(), vendor, name)
  .then(pickLatestVersion)
  .then(wildVersionByMajor)
  .catch(err => {
    if (err.response && err.response.status === 404) {
      return Promise.reject(new InterruptionException(`App ${chalk.green(app)} not found`))
    }
    return Promise.reject(err)
  })
}

function npmLatestVersion (app) {
  return latestVersion(app)
  .then(concat('^'))
  .catch(err => Promise.reject(new InterruptionException(err.message)))
}

function updateManifestDependencies (app, version) {
  return readManifest()
  .then(manifest => {
    return {
      ...manifest,
      dependencies: {
        ...manifest.dependencies,
        [app]: version,
      },
    }
  })
  .then(newManifest => JSON.stringify(newManifest, null, 2) + '\n')
  .then(manifestJson => bbWriteFile(manifestPath, manifestJson))
}

function addApp (app) {
  const hasVersion = app.indexOf('@') > -1
  if (hasVersion) {
    const [appId, version] = app.split('@')
    return updateManifestDependencies(appId, version)
  }

  const isNpm = app.startsWith('npm:')
  const appName = isNpm ? npmName(app) : app
  const versionRequest = isNpm
    ? npmLatestVersion(appName)
    : appsLatestVersion(appName)
  return versionRequest
  .then(version => updateManifestDependencies(app, version))
}

function addApps (apps) {
  const app = head(apps)
  const decApps = tail(apps)
  log.debug('Starting to add app', app)
  const appRegex = new RegExp(`^(${vendorPattern}\\.|npm:)${namePattern}(@${wildVersionPattern})?$`)
  const appPromise = appRegex.test(app)
    ? addApp(app)
    : Promise.reject(new InterruptionException(invalidAppMessage))

  return appPromise
  .then(() => decApps.length > 0 ? addApps(decApps) : Promise.resolve())
  .catch(err => {
    if (apps.length > 0 && !err.toolbeltWarning) {
      log.warn(`The following app(s) were not added: ${apps.join(', ')}`)
      err.toolbeltWarning = true
    }
    return Promise.reject(err)
  })
}

export default {
  requiredArgs: 'app',
  description: 'Add an app to the manifest dependencies',
  handler: (app, options) => {
    const apps = [app, ...options._.slice(ARGS_START_INDEX)]
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
  },
}
