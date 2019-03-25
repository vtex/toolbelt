import * as Bluebird from 'bluebird'
import chalk from 'chalk'

import { workspaces } from '../../clients'
import { getAccount, getWorkspace } from '../../conf'
import { CommandError, UserCancelledError } from '../../errors'
import log from '../../logger'
import { promptConfirm } from '../utils'
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

const promptPromoteConfirm = (workspace: string): Promise<any> =>
  promptConfirm(
    `Are you sure you want to promote workspace ${chalk.green(workspace)} to master?`,
    true
  ).then(answer => {
    if (!answer) {
      throw new UserCancelledError()
    }
  })

export default () => {
  log.debug('Promoting workspace', currentWorkspace)
  return isPromotable(currentWorkspace)
    .then(() => promptPromoteConfirm(currentWorkspace))
    .then(() => promote(account, currentWorkspace))
    .tap(() => log.info(`Workspace ${chalk.green(currentWorkspace)} promoted successfully`))
    .then(() => useCmd('master'))
}
