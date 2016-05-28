import chalk from 'chalk'
import conf from './conf'

let greeting
const account = conf.get('account')
const login = conf.get('login')

if (account && login) {
  greeting = [`Logged into ${chalk.blue(account)} as`, `${chalk.green(login)}`]
} else {
  greeting = ['Welcome to VTEX I/O', `Login with ${chalk.green('vtex login')} ${chalk.blue('<account>')}`]
}

export default greeting
