import * as React from 'react'
import { Box, Color, Text, Static } from 'ink'
import { sum } from 'ramda'

import { SpecReport, AppReport, TestReport } from '../../../../clients/Tester'
import { Completed } from './completedTest'
import { AppId } from './app'

export interface AppProps {
    appId: string
    specs: AppReport
  }

const Running: React.FunctionComponent<AppProps> = ({ appId, specs }) => {
    const specsReports = Object.values(specs)
  
    const completedSpecsCount = specsReports.reduce((acum, specReport) => {
      return acum + (completedSpec(specReport) ? 1 : 0)
    }, 0)
  
    return (
      <Box>
        <Color bgYellow black>
          {' RUNS '}
        </Color>
        <Box marginLeft={1}>
          <AppId appId={appId} />
        </Box>
        <Box marginLeft={1}>
          <Color greenBright>{`${completedSpecsCount} specs completed`}</Color>
          <Text>{`, ${specsReports.length} total`}</Text>
        </Box>
      </Box>
    )
  }

  interface AppTest {
    appId: string
    specs: AppReport
  }

export interface ReportProps {
    completedAppTests: AppTest[]
    runningAppTests: AppTest[]
}

const COMPLETED_STATES = ['passed', 'failed', 'skipped', 'error']

const completedSpec = (specReport: SpecReport) => COMPLETED_STATES.includes(specReport.state)
const completedApp = (appReport: AppReport) => {
  return Object.values(appReport).every((specReport: SpecReport) => {
    return completedSpec(specReport)
  })
}

const passedSpec = (specReport: SpecReport) => specReport.state === 'passed'
export const passedApp = (appReport: AppReport) => {
  return Object.values(appReport).every((specReport: SpecReport) => {
    return passedSpec(specReport)
  })
}

export const countPassedSpecs = (appReport: AppReport) => {
  const specsState = Object.values(appReport).map((specReport) => (passedSpec(specReport) ? 1 : 0))
  return sum(specsState)
}

export const Report: React.FunctionComponent<ReportProps> = ({ completedAppTests, runningAppTests }) => (
    <Box flexDirection="column">
      <Static>
        {completedAppTests.map(({ appId, specs }) => (
          <Completed key={appId} appId={appId} specs={specs} />
        ))}
      </Static>
  
      {runningAppTests.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          {runningAppTests.map(({ appId, specs }) => (
            <Running key={appId} appId={appId} specs={specs} />
          ))}
        </Box>
      )}
    </Box>
  )
  

  export const parseReport = (report: TestReport): ReportProps => {
    const appTests = Object.keys(report).map((appId) => {
      return { 
        appId, 
        specs: report[appId] 
      }
    })
  
    const completedAppTests = appTests.filter((appTest) => completedApp(appTest.specs))
    const runningAppTests = appTests.filter((appTest) => !completedApp(appTest.specs))
    return { completedAppTests, runningAppTests }
  }