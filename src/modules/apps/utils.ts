import {RegistryAppVersionsListItem} from '@vtex/api'
import chalk from 'chalk'
import {createReadStream} from 'fs-extra'
import * as inquirer from 'inquirer'
import {join} from 'path'
import {drop} from 'ramda'
import * as semverDiff from 'semver-diff'

import {
  __,
  compose,
  concat,
  curry,
  head,
  last,
  map,
  prop,
  reduce,
  split,
  tail,
} from 'ramda'

import {createClients} from '../../clients'
import {getWorkspace} from '../../conf'
import {CommandError} from '../../errors'
import log from '../../logger'
import {isManifestReadable} from '../../manifest'

export const pathToFileObject = (root = process.cwd()) => (path: string): BatchStream =>
  ({path, content: createReadStream(join(root, path))})

export const workspaceMasterMessage =
  `Workspace ${chalk.green('master')} is ${chalk.red('read-only')}, please use another workspace.`

export const parseArgs = (args: string[]): string[] => {
  return drop(1, args)
}

export const validateAppAction = async (app?) => {
  if (getWorkspace() === 'master') {
    if (process.argv.indexOf('--force-master') >= 0) {
      const {confirm} = await inquirer.prompt({
        default: false,
        message: `Are you sure you want to force this operation on the master workspace?`,
        name: 'confirm',
        type: 'confirm',
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

export const appsLatestVersion = (app: string): Promise<string | never> => {
  return createClients({account: 'smartcheckout'}).registry
    .listVersionsByApp(app)
    .then<RegistryAppVersionsListItem[]>(prop('data'))
    .then<string[]>(map(extractVersionFromId))
    .then<string>(pickLatestVersion)
    .then(wildVersionByMajor)
    .catch(handleError(app))
}

export const appsLastVersion = (app: string): Promise<string | never> => {
  return createClients({account: 'smartcheckout'}).registry
    .listVersionsByApp(app)
    .then<RegistryAppVersionsListItem[]>(prop('data'))
    .then<string[]>(map(extractVersionFromId))
    .then<string>(pickLatestVersion)
    .catch(handleError(app))
}

export const hasServiceOnBuilders = (manifest: Manifest): boolean => {
  return !!manifest.builders['service-js']
}
