import * as chalk from 'chalk'
import * as inquirer from 'inquirer'
import * as Bluebird from 'bluebird'
import {compose, flip, gt, length} from 'ramda'

import {CommandError} from '../../errors'
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

const isMaster = Promise.method((workspace: string) => {
  if (workspace === 'master') {
    throw new CommandError(`It is not possible to promote workspace ${workspace} to master`)
  }
})

const isPromotable = (workspace: string): Bluebird<never | void> =>
  isMaster(workspace)
    .then(listLinks())
    .then(hasLinks)
    .then(result => {
      if (!result) {
        return
      }
      throw new CommandError('You have links on your workspace, please unlink them before promoting')
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
    throw new CommandError()
  })

export default {
  description: 'Promote this workspace to master',
  handler: () => {
    log.debug('Promoting workspace', currentWorkspace)
    return isPromotable(currentWorkspace)
      .then(() => promptConfirm(currentWorkspace))
      .then(() => promote(account, currentWorkspace))
      .tap(() => log.info(`Workspace ${chalk.green(currentWorkspace)} promoted successfully`))
      .then(() => useCmd.handler('master'))
  },
}
