import chalk from 'chalk'

import {getAccount, getLogin, getWorkspace} from './conf'

const login = getLogin()
const account = getAccount()
const workspace = getWorkspace()

export const greeting = account && login && workspace
  ? [`Logged into ${chalk.blue(account)} as ${chalk.green(login)} at workspace ${chalk.green(workspace)}`]
  : ['Welcome to VTEX I/O', `Login with ${chalk.green('vtex login')} ${chalk.blue('<account>')}`]
