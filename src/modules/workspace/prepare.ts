import * as chalk from 'chalk'
import * as inquirer from 'inquirer'
import * as Bluebird from 'bluebird'
import {compose, flip, gt, length} from 'ramda'

import {CommandError} from '../../errors'
import log from '../../logger'
import {apps, colossus} from '../../clients'
import {logAll, onEvent} from '../../courier'
import {getWorkspace} from '../../conf'

const {listLinks} = apps
const currentWorkspace = getWorkspace()
const flippedGt = flip(gt)

const hasLinks =
  compose<any[], number, boolean>(flippedGt(0), length)

const prepare = (): Bluebird<void> => {
  return colossus.sendEvent('vtex.toolbelt', '-', 'buildProd')
}

const canGoLive = (): Bluebird<never | void> =>
  listLinks()
    .then(hasLinks)
    .then(result => {
      if (!result) {
        return
      }
      throw new CommandError('You have links on your workspace, please unlink them before preparing for production')
    })

const promptConfirm = (workspace: string): Bluebird<never | void> =>
  Promise.resolve(
    inquirer.prompt({
      type: 'confirm',
      name: 'confirm',
      message: `Are you sure you want to prepare workspace ${chalk.green(workspace)} to production?`,
    }),
  )
  .then(({confirm}) => {
    if (confirm) {
      return
    }
    throw new CommandError()
  })

const waitCompletion = () => {
  const unlistenLogs = logAll(log.level, 'production_requester')
  const unlistenEvents = onEvent('vtex.prodman', 'production.ready', () => {
    log.info(`Workspace ${chalk.green(currentWorkspace)} is now production ready`)
    unlistenLogs()
    unlistenEvents()
  })
}

export default {
  description: 'Prepare this workspace to be production-ready',
  handler: () => {
    log.debug('Preparing workspace', currentWorkspace)
    return canGoLive()
      .then(() => promptConfirm(currentWorkspace))
      .then(() => prepare())
      .then(() => waitCompletion())
  },
}
