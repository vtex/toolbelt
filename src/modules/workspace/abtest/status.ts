import chalk from 'chalk'
import * as moment from 'moment'
import * as numbro from 'numbro'
import * as R from 'ramda'

import { abtester } from '../../../clients'
import { getAccount } from '../../../conf'
import log from '../../../logger'
import { createTable } from '../../../table'
import { formatDuration } from './utils'

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
  KullbackLeibler: number
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
    KullbackLeibler,
  } = testInfo
  console.log(chalk.bold(`VTEX AB Test: ${chalk.blue(`${WorkspaceA} (A)`)} vs ${chalk.blue(`${WorkspaceB} (B)`)}\n`))
  const technicalTable = createTable()
  technicalTable.push(bold([`Kullback-Leibler divergence`, numbro(KullbackLeibler).format('0.000')]))

  const comparisonTable = createTable()
  comparisonTable.push(bold(['', chalk.blue(WorkspaceA), chalk.blue(WorkspaceB)]))
  comparisonTable.push(bold(['Conversion', formatPercent(ConversionA), formatPercent(ConversionB)]))
  comparisonTable.push(bold(['Expected Loss', formatPercent(ExpectedLossChoosingA), formatPercent(ExpectedLossChoosingB)]))
  comparisonTable.push(bold(['N. of Sessions', formatInteger(WorkspaceASessions), formatInteger(WorkspaceBSessions)]))
  comparisonTable.push(bold(['N. of Sessions (last 24h)',
      formatInteger(WorkspaceASessionsLast24Hours), formatInteger(WorkspaceBSessionsLast24Hours)]))

  const resultsTable = createTable()
  resultsTable.push(bold([`Start Date`, moment(ABTestBeginning).format('DD-MMM-YYYY HH:mm')]))
  const now = moment()
  const runningTime = now.diff(moment(ABTestBeginning), 'minutes')
  resultsTable.push(bold([`Running Time`, formatDuration(runningTime)]))
  resultsTable.push(bold([`Probability B beats A`, formatPercent(ProbabilityAlternativeBeatMaster)]))
  resultsTable.push(bold([chalk.bold.green(`Winner`), chalk.bold.green(Winner)]))

  console.log(`Technical:\n${technicalTable.toString()}\n`)
  console.log(`Comparative:\n${comparisonTable.toString()}\n`)
  console.log(`Results:\n${resultsTable.toString()}\n`)
}

export default async () => {

  let abTestInfo = []
  try {
    abTestInfo = await abtester.status()
  } catch (e) {
    log.error(e)
    process.exit()
  }
  if (!abTestInfo || abTestInfo.length === 0) {
    return log.info(`No AB Tests running in account ${chalk.blue(getAccount())}`)
  }
  R.map(printResultsTable, abTestInfo)
}
