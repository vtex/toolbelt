import chalk from 'chalk'

import { workspaces } from '../../clients'
import { getAccount, getWorkspace } from '../../utils/conf'
import log from '../../utils/logger'

const workspaceState = (meta: WorkspaceResponse) => (meta.production ? 'production' : 'dev')

export async function workspaceStatus(workspaceName) {
  const account = getAccount()
  const workspace = workspaceName || getWorkspace()

  const meta = await workspaces.get(account, workspace)

  log.info(
    `Workspace ${chalk.green(workspace)} in account ${chalk.blue(account)} is a ${chalk.yellowBright(
      workspaceState(meta)
    )} workspace with weight ${chalk.yellowBright(`${meta.weight}`)}`
  )
}
