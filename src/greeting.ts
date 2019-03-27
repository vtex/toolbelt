import chalk from 'chalk'

import { workspaces } from './clients'
import { getAccount, getEnvironment, getLogin, getWorkspace } from './conf'
import log from './logger'

const login = getLogin()
const account = getAccount()
const workspace = getWorkspace()
const environment = getEnvironment()

const workspaceState = (meta: WorkspaceResponse) => meta.production ? 'production' : 'dev'

const getWorkspaceState = async (): Promise<string> => {
  try {
    const meta = await workspaces.get(account, workspace)

    return workspaceState(meta) + ' '
  } catch (err) {
    log.error(`Unable to fetch workspace state`)
    log.debug(err.message)
    return ''
  }
}

export const greeting = async (): Promise<string[]> => {
  if (account && login && workspace) {
    const state = await getWorkspaceState()
    return [`Logged into ${chalk.blue(account)} as ${chalk.green(login)} at ${chalk.yellowBright(state)}workspace ${chalk.green(workspace)} in environment ${chalk.red(environment)}`]
  }

  return ['Welcome to VTEX I/O', `Login with ${chalk.green('vtex login')} ${chalk.blue('<account>')}`]
}
