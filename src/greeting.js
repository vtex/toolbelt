import chalk from 'chalk'
import {getAccount, getLogin} from './conf'

const account = getAccount()
const login = getLogin()

export const greeting = account && login
  ? [`Logged into ${chalk.blue(account)} as ${chalk.green(login)}`]
  : ['Welcome to VTEX I/O', `Login with ${chalk.green('vtex login')} ${chalk.blue('<account>')}`]
