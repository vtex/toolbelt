import {join} from 'path'
import * as chalk from 'chalk'
import {createReadStream} from 'fs-promise'

import log from '../../logger'
import {logAll, onEvent} from '../../courier'
import {getWorkspace} from '../../conf'
import {CommandError} from '../../errors'
import {isManifestReadable} from '../../manifest'

export const id = (manifest: Manifest): string =>
  `${manifest.vendor}.${manifest.name}@${manifest.version}`

export const mapFileObject = (files: string[], root = process.cwd()): BatchStream[] =>
  files.map(path => ({path, contents: createReadStream(join(root, path))}))

export const workspaceMasterMessage =
  ` ${chalk.green('master')} is ${chalk.red('read-only')}, please use another workspace`

export const listenUntilBuildSuccess = (app) => {
  const timeout = setTimeout(() => {
    unlistenStart()
    process.exit(0)
  }, 5000)

  const unlistenLogs = logAll(log.level, app.split('@')[0])
  const unlistenStart = onEvent('vtex.render-builder', 'build.start', () => {
    clearTimeout(timeout)
    unlistenStart()
    const unlistenSuccess = onEvent('vtex.render-builder', 'build.success', () => {
      unlistenLogs()
      unlistenSuccess()
      unlistenFail()
      process.exit(0)
    })
    const unlistenFail = onEvent('vtex.render-builder', 'build.fail', () => {
      log.error('Build failed')
      unlistenLogs()
      unlistenSuccess()
      unlistenFail()
      process.exit(1)
    })
  })
}

export const validateAppAction = (app?) => {
  if (getWorkspace() === 'master') {
    throw new CommandError(workspaceMasterMessage)
  }

  // No app arguments and no manifest file.
  if (!app && !isManifestReadable()) {
    throw new CommandError(`No app was found, please fix your manifest.json${app ? ' or use <vendor>.<name>[@<version>]' : ''}`)
  }
}
