import chalk from 'chalk'
import conf from './conf'

const account = conf.get('account')
const login = conf.get('login')

export const greeting = account && login
  ? [`Logged into ${chalk.blue(account)} as`, `${chalk.green(login)}`]
  : ['Welcome to VTEX I/O', `Login with ${chalk.green('vtex login')} ${chalk.blue('<account>')}`]
