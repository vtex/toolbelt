import chalk from 'chalk'
import moment from 'moment'
import numbro from 'numbro'
import R from 'ramda'
import { SessionManager } from '../../../api/session/SessionManager'
import log from '../../../api/logger'
import { createTable } from '../../../api/table'
import { abtester, formatDuration, installedABTester } from './utils'

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
  ConversionALast24Hours: number
  ConversionB: number
  ConversionBLast24Hours: number
  ProbabilityAlternativeBeatMaster: number
  PValue: number
  OrdersValueA: number
  OrdersValueB: number
  OrdersValueALast24Hours: number
  OrdersValueBLast24Hours: number
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
    ConversionALast24Hours,
    ConversionB,
    ConversionBLast24Hours,
    ProbabilityAlternativeBeatMaster,
    // PValue,
    OrdersValueA,
    OrdersValueB,
    OrdersValueALast24Hours,
    OrdersValueBLast24Hours,
  } = testInfo
  console.log(chalk.bold(`VTEX AB Test: ${chalk.blue(`${WorkspaceA} (A)`)} vs ${chalk.blue(`${WorkspaceB} (B)`)}\n`))
  if (R.any(R.isNil)([ExpectedLossChoosingA, ExpectedLossChoosingB, ProbabilityAlternativeBeatMaster])) {
    log.error(
      'Unexpected value of conversion. Perhaps your user traffic is too small and this creates distortions in the data'
    )
  }

  const rawDataTable = createTable()
  rawDataTable.push(bold(['', chalk.blue(WorkspaceA), chalk.blue(WorkspaceB)]))
  rawDataTable.push(bold(['Conversion', formatPercent(ConversionA), formatPercent(ConversionB)]))
  rawDataTable.push(
    bold(['Conversion (last 24h)', formatPercent(ConversionALast24Hours), formatPercent(ConversionBLast24Hours)])
  )
  rawDataTable.push(bold(['N. of Sessions', formatInteger(WorkspaceASessions), formatInteger(WorkspaceBSessions)]))
  rawDataTable.push(
    bold([
      'N. of Sessions (last 24h)',
      formatInteger(WorkspaceASessionsLast24Hours),
      formatInteger(WorkspaceBSessionsLast24Hours),
    ])
  )
  rawDataTable.push(bold(['Revenue', formatInteger(OrdersValueA), formatInteger(OrdersValueB)]))
  rawDataTable.push(
    bold(['Revenue (last 24h)', formatInteger(OrdersValueALast24Hours), formatInteger(OrdersValueBLast24Hours)])
  )

  const comparisonTable = createTable()
  comparisonTable.push(bold(['', chalk.blue(WorkspaceA), chalk.blue(WorkspaceB)]))
  comparisonTable.push(
    bold(['Expected Loss', formatPercent(ExpectedLossChoosingA), formatPercent(ExpectedLossChoosingB)])
  )

  const probabilitiesTable = createTable()
  probabilitiesTable.push(bold(['Event', 'Condition', 'Probability']))
  probabilitiesTable.push(bold(['B beats A', 'None', formatPercent(ProbabilityAlternativeBeatMaster)]))

  // While we're not confident in this calculation, we shouldn't show it to our users
  // probabilitiesTable.push(bold(['Data as extreme as the observed', `Workspaces being equal (both to ${chalk.blue(WorkspaceA)}).`, formatPercent(PValue)]))

  const resultsTable = createTable()
  resultsTable.push(bold([`Start Date`, `${moment(ABTestBeginning).format('DD-MMM-YYYY HH:mm')} (UTC)`]))
  const nowUTC = moment.utc()
  const runningTime = nowUTC.diff(moment.utc(ABTestBeginning), 'minutes')
  resultsTable.push(bold([`Running Time`, formatDuration(runningTime)]))
  resultsTable.push(bold([chalk.bold.green(`Winner`), chalk.bold.green(Winner)]))

  console.log(`Raw Data:\n${rawDataTable.toString()}\n`)
  console.log(`Comparison of losses in case of choosing wrong workspace:\n${comparisonTable.toString()}\n`)
  console.log(`Probabilities:\n${probabilitiesTable.toString()}\n`)
  console.log(`Results:\n${resultsTable.toString()}\n`)
}

export default async () => {
  const { account } = SessionManager.getSingleton()
  await installedABTester()
  let abTestInfo = []
  abTestInfo = await abtester.status()
  if (!abTestInfo || abTestInfo.length === 0) {
    return log.info(`No AB Tests running in account ${chalk.blue(account)}\n`)
  }
  R.map(printResultsTable, abTestInfo)
}
