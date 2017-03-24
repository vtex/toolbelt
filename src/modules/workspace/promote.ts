import * as chalk from 'chalk'
import * as inquirer from 'inquirer'
import * as Bluebird from 'bluebird'
import {compose, flip, gt, length} from 'ramda'

import useCmd from './use'
import log from '../../logger'
import {apps, workspaces} from '../../clients'
import {getAccount, getWorkspace} from '../../conf'

const {listLinks} = apps
const {promote} = workspaces
const [account, currentWorkspace] = [getAccount(), getWorkspace()]

const flippedGt = flip(gt)

const hasLinks =
  compose<any[], number, boolean>(flippedGt(0), length)

const isPromotable = (): Bluebird<never | void> =>
  listLinks()
    .then(hasLinks)
    .then(result => {
      if (!result) {
        return
      }
      const err = new Error()
      err.name = 'InterruptionError'
      log.error('You have links on your workspace, please unlink them before promoting')
      throw err
    })

const promptConfirm = (workspace: string): Bluebird<never | void> =>
  Promise.resolve(
    inquirer.prompt({
      type: 'confirm',
      name: 'confirm',
      message: `Are you sure you want to promote workspace ${chalk.green(workspace)} to master?`,
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

export default {
  description: 'Promote this workspace to master',
  handler: () => {
    log.debug('Promoting workspace', currentWorkspace)
    return isPromotable()
      .then(() => promptConfirm(currentWorkspace))
      .then(() => promote(account, currentWorkspace))
      .tap(() => log.info(`Workspace ${chalk.green(currentWorkspace)} promoted successfully`))
      .then(() => useCmd.handler('master'))
  },
}
