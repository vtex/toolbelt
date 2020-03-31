import * as React from 'react'
import { Box, Color } from 'ink'
import { groupBy, toPairs } from 'ramda'

import { SpecReport, AppReport } from '../../../../clients/Tester'
import { FailedSpec } from './failedTest'
import { AppId } from './app'


const completedAppColors = (fail: [string, SpecReport][]) => {
  if (fail.length === 0) return { bgGreen: true, black: true }
  return { bgRed: true, white: true }
}

export interface AppProps {
  appId: string
  specs: AppReport
}

export const Completed: React.FunctionComponent<AppProps> = ({ appId, specs }) => {
  const specsReports = toPairs(specs)
  const { fail = [] } = groupBy(([, sr]) => (sr.state === 'passed' ? 'pass' : 'fail'), specsReports)
  const failed = fail.length > 0
  return (
    <Box flexDirection="column">
      <Box>
        <Color {...completedAppColors(fail)}>{failed ? ' FAIL ' : ' PASS '}</Color>
        <Box marginLeft={1}>
          <AppId appId={appId} />
        </Box>
      </Box>
      <Box flexDirection="column" marginLeft={2}>
        {fail.map(([spec, sr]) => (
          <FailedSpec key={spec} spec={spec} report={sr} />
        ))}
      </Box>
    </Box>
  )
}