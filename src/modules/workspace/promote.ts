import * as Bluebird from 'bluebird'
import chalk from 'chalk'
import * as inquirer from 'inquirer'
import { compose, flip, gt, length } from 'ramda'

import { apps, workspaces } from '../../clients'
import { getAccount, getWorkspace } from '../../conf'
import { CommandError } from '../../errors'
import log from '../../logger'
import useCmd from './use'

const { listLinks } = apps
const { promote, get } = workspaces
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
    .then(listLinks)
    .then(hasLinks)
    .then(result => {
      if (!result) {
        return
      }
      throw new CommandError('You have links on your workspace, please unlink them before promoting')
    }).then(async () => {
      const meta = await get(account, currentWorkspace)
      if (!meta.production) {
        throw new CommandError(`Workspace ${chalk.green(currentWorkspace)} is not in ${chalk.green('production mode')}\nOnly production workspaces with no linked apps may be promoted\nUse the command ${chalk.blue('vtex production')} to set it to production mode`)
      }
    })

const promptConfirm = (workspace: string): Promise<any> =>
  inquirer.prompt({
    message: `Are you sure you want to promote workspace ${chalk.green(workspace)} to master?`,
    name: 'confirm',
    type: 'confirm',
  }).then(({ confirm }) => {
    if (!confirm) {
      process.exit()
    }
  })

export default () => {
  log.debug('Promoting workspace', currentWorkspace)
  return isPromotable(currentWorkspace)
    .then(() => promptConfirm(currentWorkspace))
    .then(() => promote(account, currentWorkspace))
    .tap(() => log.info(`Workspace ${chalk.green(currentWorkspace)} promoted successfully`))
    .then(() => useCmd('master'))
}
