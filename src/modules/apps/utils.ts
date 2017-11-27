import {join} from 'path'
import * as chalk from 'chalk'
import * as Bluebird from 'bluebird'
import * as inquirer from 'inquirer'
import {createReadStream} from 'fs-extra'
import * as semverDiff from 'semver-diff'
import {splitAt, flatten, values} from 'ramda'
import {RegistryAppVersionsListItem} from '@vtex/api'

import {
  __,
  map,
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
import {getWorkspace} from '../../conf'
import {CommandError} from '../../errors'
import {createClients} from '../../clients'
import {isManifestReadable} from '../../manifest'

export const pathToFileObject = (root = process.cwd()) => (path: string): BatchStream =>
  ({path, content: createReadStream(join(root, path))})

export const workspaceMasterMessage =
  `Workspace ${chalk.green('master')} is ${chalk.red('read-only')}, please use another workspace.`

export const parseArgs = (args: string[]) => {
  const [, commands] = splitAt(1, flatten(values(args)))
  return commands
}

export const validateAppAction = async (app?) => {
  if (getWorkspace() === 'master') {
    if (process.argv.indexOf('--force-master') >= 0) {
      const {confirm} = await inquirer.prompt({
        type: 'confirm',
        name: 'confirm',
        default: false,
        message: `Are you sure you want to force this operation on the master workspace?`,
      })
      if (!confirm) {
        process.exit(1)
      }
      log.warn('Using master workspace. I hope you know what you\'re doing. 💥')
    } else {
      throw new CommandError(workspaceMasterMessage)
    }
  }

  // No app arguments and no manifest file.
  const isReadable = await isManifestReadable()
  if (!app && !isReadable) {
    throw new CommandError(`No app was found, please fix your manifest.json${app ? ' or use <vendor>.<name>[@<version>]' : ''}`)
  }
}

export const wildVersionByMajor = compose<string, string[], string, string>(concat(__, '.x'), head, split('.'))

export const extractVersionFromId =
  compose<VersionByApp, string, string[], string>(last, split('@'), prop('versionIdentifier'))

export const pickLatestVersion = (versions: string[]): string => {
  const start = head(versions)
  return reduce((acc: string, version: string) => {
    return semverDiff(acc, version) ? version : acc
  }, start, tail(versions))
}

export const handleError = curry((app: string, err: any) => {
  if (err.response && err.response.status === 404) {
    return Promise.reject(new CommandError(`App ${chalk.green(app)} not found`))
  }
  return Promise.reject(err)
})

export const appsLatestVersion = (app: string): Bluebird<string | never> => {
  return createClients({account: 'smartcheckout'}).registry
    .listVersionsByApp(app)
    .then<RegistryAppVersionsListItem[]>(prop('data'))
    .then(map(extractVersionFromId))
    .then(pickLatestVersion)
    .then(wildVersionByMajor)
    .catch(handleError(app))
}

export const appsLastVersion = (app: string): Bluebird<string | never> => {
  return createClients({account: 'smartcheckout'}).registry
    .listVersionsByApp(app)
    .then<RegistryAppVersionsListItem[]>(prop('data'))
    .then(map(extractVersionFromId))
    .then(pickLatestVersion)
    .catch(handleError(app))
}

export const hasServiceOnBuilders = (manifest: Manifest): boolean => {
  return manifest.builders["service-js"]
}
