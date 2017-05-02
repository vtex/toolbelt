import * as chalk from 'chalk'
import * as inquirer from 'inquirer'
import * as Bluebird from 'bluebird'
import {compose, flip, gt, length} from 'ramda'

import log from '../../logger'
import {apps, colossus} from '../../clients'
import {listen, onEvent} from '../../courier'
import {getAccount, getWorkspace} from '../../conf'

const {listLinks} = apps
const [account, currentWorkspace] = [getAccount(), getWorkspace()]

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
      const err = new Error()
      err.name = 'InterruptionError'
      log.error('You have links on your workspace, please unlink them before preparing for production')
      throw err
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
    const err = new Error()
    err.name = `InterruptionError`
    throw err
  })

const waitCompletion = () => {
  const logHandler = listen(account, currentWorkspace, log.level, 'production_requester')
  const eventHandler = onEvent(account, currentWorkspace, 'vtex.prodman', 'production.ready', () => {
    log.info(`Workspace ${chalk.green(currentWorkspace)} is now production ready`)
    logHandler.close()
    eventHandler.close()
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
