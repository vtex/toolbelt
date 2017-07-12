import {join} from 'path'
import * as chalk from 'chalk'
import * as inquirer from 'inquirer'
import {createReadStream} from 'fs-extra'

import log from '../../logger'
import {logAll, onEvent} from '../../sse'
import {getWorkspace} from '../../conf'
import {CommandError} from '../../errors'
import {isManifestReadable} from '../../manifest'

export const id = (manifest: Manifest): string =>
  `${manifest.vendor}.${manifest.name}@${manifest.version}`

export const mapFileObject = (files: string[], root = process.cwd()): BatchStream[] =>
  files.map(path => ({path, contents: createReadStream(join(root, path))}))

export const workspaceMasterMessage =
  `Workspace ${chalk.green('master')} is ${chalk.red('read-only')}, please use another workspace.`

export const listenBuildSuccess = (appOrKey, callback) => {
  const timeout = setTimeout(() => {
    unlistenStart()
    unlistenSuccess()
    unlistenFail()
    callback()
  }, 5000)
  const unlistenLogs = logAll(log.level, appOrKey.split('@')[0])
  const unlistenStart = onEvent('vtex.render-builder', 'build.start', () => {
    clearTimeout(timeout)
    unlistenStart()
  })
  const unlistenSuccess = onEvent('vtex.render-builder', 'build.success', () => {
    unlistenLogs()
    unlistenSuccess()
    unlistenFail()
    callback()
  })
  const unlistenFail = onEvent('vtex.render-builder', 'build.fail', () => {
    unlistenLogs()
    unlistenSuccess()
    unlistenFail()
    callback(true)
  })
}

export const listenUntilBuildSuccess = (appOrKey) => {
  listenBuildSuccess(appOrKey, (err) => {
    if (err) {
      log.error('Build failed')
    }
    process.exit(err ? 1 : 0)
  })
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
  if (!app && !isManifestReadable()) {
    throw new CommandError(`No app was found, please fix your manifest.json${app ? ' or use <vendor>.<name>[@<version>]' : ''}`)
  }
}
