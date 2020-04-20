import ora from 'ora'
import chalk from 'chalk'

import log from '../../logger'
import { lighthouse, workspaces } from '../../clients'
import { getAccount, getWorkspace } from '../../conf'
import { TableGenerator } from './TableGenerator'

const [account, currentWorkspace] = [getAccount(), getWorkspace()]

async function isProdutionWorkspace(): Promise<boolean> {
  const meta = await workspaces.get(account, currentWorkspace)
  return meta.production
}

export default async (url: string, option) => {
  if (await isProdutionWorkspace()) {
    log.error(`You can not run lighthoust audits on production workspaces.`)
    return
  }

  const spinner = ora(`Running Lighthouse on url: ${chalk.blue(url)}`).start()
  try {
    const report: any[] = await lighthouse.runAudit(url)
    spinner.stop()

    if (option.j || option.json) {
      console.log(JSON.stringify(report, null, 1))
    } else {
      const table = new TableGenerator()
      table.addReportScores(report)
      table.show()
    }
  } catch (error) {
    spinner.stop()
    log.error(error)
  }
}
