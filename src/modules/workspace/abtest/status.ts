import chalk from 'chalk'
import * as moment from 'moment'
import * as numbro from 'numbro'
import * as R from 'ramda'

import { getAccount } from '../../../conf'
import log from '../../../logger'
import { createTable } from '../../../table'
import {
  abtester,
  installedABTester,
  formatDuration,
} from './utils'


interface ABTestStatus {
  ABTestBeginning: string
  WorkspaceA: string
  WorkspaceB: string
  Winner: string
  WorkspaceASessions: number
  WorkspaceBSessions: number
  WorkspaceASessionsLast24Hours: number
  WorkspaceBSessionsLast24Hours: number
  ExpectedLossChoosingA: number
  ExpectedLossChoosingB: number
  ConversionA: number
  ConversionB: number
  ProbabilityAlternativeBeatMaster: number
}

const formatPercent = (n: number) => numbro(n).format('0.000%')

const formatInteger = (n: number) => numbro(n).format('0,0')

const bold = (stringList: any[]) => R.map(chalk.bold)(stringList)

const printResultsTable = (testInfo: ABTestStatus) => {
  const {
    ABTestBeginning,
    WorkspaceA,
    WorkspaceB,
    Winner,
    WorkspaceASessions,
    WorkspaceBSessions,
    WorkspaceASessionsLast24Hours,
    WorkspaceBSessionsLast24Hours,
    ExpectedLossChoosingA,
    ExpectedLossChoosingB,
    ConversionA,
    ConversionB,
    ProbabilityAlternativeBeatMaster,
  } = testInfo
  console.log(chalk.bold(`VTEX AB Test: ${chalk.blue(`${WorkspaceA} (A)`)} vs ${chalk.blue(`${WorkspaceB} (B)`)}\n`))
  if (R.any(R.isNil)([ExpectedLossChoosingA, ExpectedLossChoosingB, ProbabilityAlternativeBeatMaster])) {
    log.error('Unexpected value of conversion. Perhaps your user traffic is too small and this creates distortions in the data')

  }

  const comparisonTable = createTable()
  comparisonTable.push(bold(['', chalk.blue(WorkspaceA), chalk.blue(WorkspaceB)]))
  comparisonTable.push(bold(['Conversion', formatPercent(ConversionA), formatPercent(ConversionB)]))
  comparisonTable.push(bold(['Expected Loss', formatPercent(ExpectedLossChoosingA), formatPercent(ExpectedLossChoosingB)]))
  comparisonTable.push(bold(['N. of Sessions', formatInteger(WorkspaceASessions), formatInteger(WorkspaceBSessions)]))
  comparisonTable.push(bold(['N. of Sessions (last 24h)',
      formatInteger(WorkspaceASessionsLast24Hours), formatInteger(WorkspaceBSessionsLast24Hours)]))

  const resultsTable = createTable()
  resultsTable.push(bold([`Start Date`, `${moment(ABTestBeginning).format('DD-MMM-YYYY HH:mm')} (UTC)`]))
  const nowUTC = moment.utc()
  const runningTime = nowUTC.diff(moment.utc(ABTestBeginning), 'minutes')
  resultsTable.push(bold([`Running Time`, formatDuration(runningTime)]))
  resultsTable.push(bold([`Probability B beats A`, formatPercent(ProbabilityAlternativeBeatMaster)]))
  resultsTable.push(bold([chalk.bold.green(`Winner`), chalk.bold.green(Winner)]))

  console.log(`Comparative:\n${comparisonTable.toString()}\n`)
  console.log(`Results:\n${resultsTable.toString()}\n`)
}

export default async () => {
  await installedABTester()
  let abTestInfo = []
  abTestInfo = await abtester.status()
  if (!abTestInfo || abTestInfo.length === 0) {
    return log.info(`No AB Tests running in account ${chalk.blue(getAccount())}\n`)
  }
  R.map(printResultsTable, abTestInfo)
}
