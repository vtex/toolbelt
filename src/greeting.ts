import chalk from 'chalk'

import { workspaces } from './clients'
import { getAccount, getLogin, getWorkspace } from './conf'
import log from './logger'

const login = getLogin()
const account = getAccount()
const workspace = getWorkspace()

const workspaceState = (meta: WorkspaceResponse) => meta.production ? 'production' : 'dev'

const getWorkspaceState = async (): Promise<string> => {
  try {
    const meta = await workspaces.get(account, workspace)

    return workspaceState(meta) + ' '
  } catch (err) {
    log.debug(`Unable to fetch workspace state`)
    log.debug(err.message)
    return undefined
  }
}

export const greeting = async (): Promise<string[]> => {
  if (account && login && workspace) {
    let loggedMessage = 'Logged into'
    let state = await getWorkspaceState()
    if (!state) {
      loggedMessage = `${chalk.red('Not logged in')}. Previously logged into`
      state = ''
    }
    return [`${loggedMessage} ${chalk.blue(account)} as ${chalk.green(login)} at ${chalk.yellowBright(state)}workspace ${chalk.green(workspace)}`]
  }

  return ['Welcome to VTEX I/O', `Login with ${chalk.green('vtex login')} ${chalk.blue('<account>')}`]
}
