import chalk from 'chalk'
import logger from '../../logger'

export default async () => {
  logger.error(
    `${chalk.bold.red(
      `Your app was NOT deployed. The command 'vtex validate' is deprecated, please use`
    )} ${chalk.bold.blue('vtex deploy')} ${chalk.bold.red(`instead.`)}`
  )
  process.exit(1)
}
