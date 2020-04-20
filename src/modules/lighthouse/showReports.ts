import ora from 'ora'
import chalk from 'chalk'

import log from '../../logger'
import { lighthouse } from '../../clients'

import { TableGenerator } from './TableGenerator'

export async function showReports(app: string, url: string) {
  const spinner = ora(`Querying reports containing app: ${chalk.green(app)} and url: ${chalk.blue(url)}`).start()
  try {
    const reports = await lighthouse.getReports(app, url)
    spinner.stop()

    if (reports.length === 0) {
      log.info(`No reports with app: ${chalk.green(app)} and url: ${chalk.blue(url)}`)
      return
    }

    const table = new TableGenerator()
    table.addListOfReports(reports)

    table.show()
  } catch (error) {
    spinner.stop()
    log.error(error)
  }
}
