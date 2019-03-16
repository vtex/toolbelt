import chalk from 'chalk'

import { workspaces } from '../../clients'
import { getAccount, getWorkspace } from '../../conf'
import log from '../../logger'

const workspaceState = (meta: WorkspaceResponse) => meta.production ? 'production' : 'dev'

export default async (name: string): Promise<void> => {
  const account = getAccount()
  const workspace = name || getWorkspace()

  const meta = await workspaces.get(account, workspace)

  log.info(`Workspace ${chalk.green(workspace)} in account ${chalk.blue(account)} is a ${chalk.yellowBright(workspaceState(meta))} workspace with weight ${chalk.yellowBright(`${meta.weight}`)}`)
}
