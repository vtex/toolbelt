import chalk from 'chalk'
import logger from '../../logger'

export default async () => {
  logger.error(`This command is being deprecated in favor of ${chalk.bold.blue('vtex deploy')}`)
  logger.warn(`Your app wasn't deployed`)
  process.exit(1)
}
