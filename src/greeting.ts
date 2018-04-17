import chalk from 'chalk'

import {getAccount, getLogin, getWorkspace, getEnvironment} from './conf'

const login = getLogin()
const account = getAccount()
const workspace = getWorkspace()
const environment = getEnvironment()

export const greeting = account && login && workspace
  ? [`Logged into ${chalk.blue(account)} as ${chalk.green(login)} at workspace ${chalk.green(workspace)} in environment ${chalk.red(environment)}`]
  : ['Welcome to VTEX I/O', `Login with ${chalk.green('vtex login')} ${chalk.blue('<account>')}`]
