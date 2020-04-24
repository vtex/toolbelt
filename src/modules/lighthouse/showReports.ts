import ora from 'ora'
import chalk from 'chalk'

import log from '../../logger'
import { lighthouse } from '../../clients'

import { TableGenerator } from './TableGenerator'

function allWhenUndefined(atribute: string): string {
  return !atribute ? '<all>' : atribute
}

function appUrlFormatString(app: string, url: string) {
  return `${chalk.green(allWhenUndefined(app))} and url: ${chalk.blue(allWhenUndefined(url))}`
}

export async function showReports(app: string, url: string) {
  if (!app && !url) {
    log.error('You must specify, at least, app or url flags to query reports')
    return
  }

  const spinner = ora(
    // eslint-disable-next-line prettier/prettier
    `Querying reports containing app: ${appUrlFormatString(app, url)}`
  ).start()
  try {
    const reports = await lighthouse.getReports(app, url)
    spinner.stop()

    if (reports.length === 0) {
      log.info(`No reports with app: ${appUrlFormatString(app, url)}`)
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
