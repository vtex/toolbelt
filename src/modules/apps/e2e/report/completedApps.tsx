import * as React from 'react'
import { Box, Color } from 'ink'

import { SpecReport } from '../../../../lib/clients/IOClients/apps/Tester'
import { FailedSpec } from './failedApps'
import { AppId } from './appId'
import { AppProps } from './index'

const completedAppColors = (failed: boolean) => {
  if (failed) {
    return { bgRed: true, white: true }
  }

  return { bgGreen: true, black: true }
}

interface SpecResult {
  specName: string
  specReport: SpecReport
}

export const Completed: React.FunctionComponent<AppProps> = ({ appId, specs }) => {
  const failedSpecs = Object.keys(specs).reduce((acum, curSpecName) => {
    if (specs[curSpecName].state !== 'passed') {
      acum.push({ specName: curSpecName, specReport: specs[curSpecName] })
    }

    return acum
  }, [] as SpecResult[])

  const failed = failedSpecs.length > 0

  return (
    <Box flexDirection="column">
      <Box>
        <Color {...completedAppColors(failed)}>{failed ? ' FAIL ' : ' PASS '}</Color>
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
