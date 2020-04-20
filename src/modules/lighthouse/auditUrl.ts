import chalk from 'chalk'

import log from '../../logger'
import { lighthouse, workspaces } from '../../clients'
import { getAccount, getWorkspace } from '../../conf'

const [account, currentWorkspace] = [getAccount(), getWorkspace()]

async function isProdutionWorkspace(): Promise<boolean> {
  const meta = await workspaces.get(account, currentWorkspace)
  return meta.production
}

const cols = ['Performance', 'Accessibility', 'Best Practices', 'SEO']

interface TableRow {
  [title: string]: number
}

function addScoresToRow(report: any[], row: TableRow) {
  report.forEach(audit => (row[audit.title] = audit.score))
}

function printScoreTable(report: any[]) {
  const rows = []
  const row: TableRow = {}

  addScoresToRow(report, row)
  rows.push(row)

  console.table(rows, cols)
}

export default async (url: string, option) => {
  if (await isProdutionWorkspace()) {
    log.error(`You can not run lighthoust audits on production workspaces.`)
    return
  }

  log.info(`Lighthouse audit on: ${chalk.blue(url)}`)
  try {
    const report: any[] = await lighthouse.runAudit(url)

    if (option.j || option.json) {
      console.log(JSON.stringify(report, null, 1))
    } else {
      printScoreTable(report)
    }
  } catch (error) {
    log.error(error)
  }
}
