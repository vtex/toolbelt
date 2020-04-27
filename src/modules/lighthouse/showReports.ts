import ora from 'ora'
import chalk from 'chalk'

import log from '../../logger'
import { lighthouse } from '../../clients'
import { TelemetryCollector } from '../../lib/telemetry/TelemetryCollector'

import { TableGenerator } from './TableGenerator'

function allWhenUndefined(atribute: string | undefined): string {
  return atribute ?? '<all>'
}

function appUrlFormatString(app: string | undefined, url: string | undefined) {
  return `${chalk.green(allWhenUndefined(app))} and url: ${chalk.blue(allWhenUndefined(url))}`
}

export async function showReports(app: string | undefined, url: string | undefined) {
  if (!app && !url) {
    log.error('You must specify app or url flags to query reports')
    return
  }

  const spinner = ora(`Querying reports containing app: ${appUrlFormatString(app, url)}`).start()
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

    TelemetryCollector.createAndRegisterErrorReport({ originalError: error })
    log.error(error)
  }
}
