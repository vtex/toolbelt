import * as React from 'react'
import { Box, Color } from 'ink'

import { SpecReport } from '../../../../clients/Tester'
import { FailedSpec } from './failedTest'
import { AppId } from './app'
import { AppProps } from './index'


const completedAppColors = (failedSpecs: SpecResult[]) => {
  if (failedSpecs.length === 0) return { bgGreen: true, black: true }
  return { bgRed: true, white: true }
}

interface SpecResult {
  specName: string
  specReport: SpecReport
}

export const Completed: React.FunctionComponent<AppProps> = ({ appId, specs }) => {
  const failedSpecs = Object.keys(specs).reduce((acum, curSpecName) => {
    if(specs[curSpecName].state !== 'passed') {
      acum.push({ specName: curSpecName, specReport: specs[curSpecName] })
    }

    return acum
  }, [] as SpecResult[])

  const failed = failedSpecs.length > 0
  
  return (
    <Box flexDirection="column">
      <Box>
        <Color {...completedAppColors(failedSpecs)}>{failed ? ' FAIL ' : ' PASS '}</Color>
        <Box marginLeft={1}>
          <AppId appId={appId} />
        </Box>
      </Box>
      <Box flexDirection="column" marginLeft={2}>
        {failedSpecs.map(({ specReport, specName }) => (
          <FailedSpec key={specName} spec={specName} report={specReport} />
        ))}
      </Box>
    </Box>
  )
}