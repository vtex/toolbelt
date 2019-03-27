import chalk from 'chalk'
import * as moment from 'moment'
import * as R from 'ramda'

import { abtester } from '../../../clients'
import { getAccount } from '../../../conf'
import log from '../../../logger'
import { createTable } from '../../../table'

interface ABTestStatus {
  ABTestBeginning: string
  WorkspaceA: string
  WorkspaceB: string
  Winner: string
  ExpectedLossChoosingA: number
  ConversionA: number
  ExpectedLossChoosingB: number
  ConversionB: number
  ProbabilityAlternativeBeatMaster: number
  KullbackLeibler: number
}

const printResultsTable = (testInfo: ABTestStatus) => {
  const {
    ABTestBeginning,
    WorkspaceA,
    WorkspaceB,
    Winner,
    ExpectedLossChoosingA,
    ConversionA,
    ExpectedLossChoosingB,
    ConversionB,
    ProbabilityAlternativeBeatMaster,
    KullbackLeibler,
  } = testInfo
  log.info(`VTEX AB Test: ${WorkspaceA} vs ${WorkspaceB}`)
  console.log(`Winner: ${Winner}`)
  console.log(`Probability that B beats A: ${ProbabilityAlternativeBeatMaster}`)
  console.log(`Start Date: ${ABTestBeginning}`)
  const now = moment()
  const runningTime = now.diff(moment(ABTestBeginning), 'days')
  console.log(`Running Time: ${runningTime}`)
  console.log(`Kullback-Leibler divergence: ${KullbackLeibler}`)
  const table = createTable()
  table.push(['', chalk.bold(WorkspaceA), chalk.bold(WorkspaceB)])
  table.push(['Conversion', ConversionA, ConversionB])
  table.push(['Expected Loss', ExpectedLossChoosingA, ExpectedLossChoosingB])
  console.log(`${table.toString()}\n`)
}

export default async () => {
  const abTestInfo = await abtester.Status()
  if (!abTestInfo || abTestInfo.length === 0) {
    return log.info(`No AB Tests running in account ${chalk.blue(getAccount())}`)
  }
  R.map(printResultsTable, abTestInfo)
}
