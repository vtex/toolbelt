import * as React from 'react'
import { Box, Color, Text } from 'ink'
import { sum } from 'ramda'

import { ReportProps } from './index'
import { passedApp, passedSpec } from './specsState'
import { AppReport } from '../../../../clients/Tester'

interface SummaryProps extends ReportProps {
  testId: string
  requestedAt?: number
}

const countPassedSpecs = (appReport: AppReport) => {
  const specsState = Object.values(appReport).map(specReport => (passedSpec(specReport) ? 1 : 0))
  return sum(specsState)
}

const countPassedSpecsFromAppsTests = (appTests: AppReport[]) => {
  return sum(appTests.map(countPassedSpecs))
}

const countAllSpecsFromAppsTests = (appTests: AppReport[]) => {
  return sum(appTests.map(appSpecs => Object.keys(appSpecs).length))
}

export const Summary: React.FunctionComponent<SummaryProps> = ({
  completedAppTests,
  runningAppTests,
  testId,
  requestedAt,
}) => {
  const passedAppsCount = completedAppTests.reduce(
    (acum, curApp) => (acum as number) + (passedApp(curApp.specs) ? 1 : 0),
    0
  )

  const completedAppTestsSpecs = completedAppTests.map(({ specs }) => specs)
  const runningAppTestsSpecs = runningAppTests.map(({ specs }) => specs)

  const passedSpecs =
    countPassedSpecsFromAppsTests(completedAppTestsSpecs) + countPassedSpecsFromAppsTests(runningAppTestsSpecs)
  const totalSpecs =
    countAllSpecsFromAppsTests(completedAppTestsSpecs) + countAllSpecsFromAppsTests(runningAppTestsSpecs)

  const [timePassed, setTimePassed] = React.useState(requestedAt ? Math.floor((Date.now() - requestedAt) / 1000) : null)

  React.useEffect(() => {
    if (timePassed == null || runningAppTests.length === 0) return
    const timeout = setTimeout(() => setTimePassed(Math.floor((Date.now() - requestedAt) / 1000)), 1000)
    return () => clearTimeout(timeout)
  })

  return (
    <React.Fragment>
      <Box flexDirection="column" marginRight={1}>
        <Text bold>TestId:</Text>
        <Text bold>Apps:</Text>
        <Text bold>Specs:</Text>
        {timePassed ? <Text bold>Time:</Text> : null}
      </Box>
      <Box flexDirection="column">
        <Text>{testId}</Text>
        <Text>
          <Color greenBright>{passedAppsCount} passed</Color>, {passedAppsCount} of {completedAppTests.length} total
        </Text>
        <Text>
          <Color greenBright>{passedSpecs} passed</Color>, {passedSpecs} of {totalSpecs} total
        </Text>
        {timePassed ? <Text>{`${timePassed}s`}</Text> : null}
      </Box>
    </React.Fragment>
  )
}
