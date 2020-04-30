import ora from 'ora'
import chalk from 'chalk'

import log from '../../logger'
import { lighthouse, workspaces } from '../../clients'
import { SessionManager } from '../../lib/session/SessionManager'
import { TelemetryCollector } from '../../lib/telemetry/TelemetryCollector'

import { TableGenerator } from './TableGenerator'

async function isProdutionWorkspace(account: string, workspace: string): Promise<boolean> {
  const meta = await workspaces.get(account, workspace)
  return meta.production
}

export default async (url: string, option: any) => {
  const { workspace, account } = SessionManager.getSingleton()

  if (await isProdutionWorkspace(account, workspace)) {
    log.error(`You cannot run lighthouse audits on production workspaces.`)
    return
  }

  const spinner = ora(`Running Lighthouse on url: ${chalk.blue(url)}`).start()
  try {
    const report = await lighthouse.runAudit(url)
    spinner.stop()

    if (option.json) {
      console.log(JSON.stringify(report, null, 1))
    } else {
      const table = new TableGenerator()
      table.addReportScores(report)
      table.show()
    }
  } catch (error) {
    spinner.stop()

    TelemetryCollector.createAndRegisterErrorReport({ originalError: error })
    log.error(error)
  }
}
