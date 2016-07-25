import chalk from 'chalk'
import {getAccount, getLogin, getWorkspace} from './conf'

const account = getAccount()
const login = getLogin()
const workspace = getWorkspace()

export const greeting = account && login && workspace
  ? [`Logged into ${chalk.blue(account)} as ${chalk.green(login)} at workspace ${chalk.green(workspace)}`]
  : account && login ? [`Logged into ${chalk.blue(account)} as ${chalk.green(login)}`]
  : ['Welcome to VTEX I/O', `Login with ${chalk.green('vtex login')} ${chalk.blue('<account>')}`]
