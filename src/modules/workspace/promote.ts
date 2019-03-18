import * as Bluebird from 'bluebird'
import chalk from 'chalk'
import * as inquirer from 'inquirer'

import { workspaces } from '../../clients'
import { getAccount, getWorkspace } from '../../conf'
import { CommandError, UserCancelledError } from '../../errors'
import log from '../../logger'
import useCmd from './use'

const { promote, get } = workspaces
const [account, currentWorkspace] = [getAccount(), getWorkspace()]

const isMaster = Promise.method((workspace: string) => {
  if (workspace === 'master') {
    throw new CommandError(`It is not possible to promote workspace ${workspace} to master`)
  }
})

const isPromotable = (workspace: string): Bluebird<never | void> =>
  isMaster(workspace)
    .then(async () => {
      const meta = await get(account, currentWorkspace)
      if (!meta.production) {
        throw new CommandError(`Workspace ${chalk.green(currentWorkspace)} is not a ${chalk.green('production')} workspace\nOnly production workspaces may be promoted\nUse the command ${chalk.blue('vtex workspace create <workspace> --production')} to create a production workspace`)
      }
    })

const promptConfirm = (workspace: string): Promise<any> =>
  inquirer.prompt({
    message: `Are you sure you want to promote workspace ${chalk.green(workspace)} to master?`,
    name: 'confirm',
    type: 'confirm',
  }).then(({ confirm }) => {
    if (!confirm) {
      throw new UserCancelledError()
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
