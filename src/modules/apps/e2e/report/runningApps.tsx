import * as React from 'react'
import { Box, Color, Text } from 'ink'

import { AppId } from './appId'
import { completedSpec } from './specsState'
import { AppProps } from './index'
import { SpecReport } from '../../../../api/clients/IOClients/apps/Tester'

export const Running: React.FunctionComponent<AppProps> = ({ appId, specs }) => {
  const specsReports = Object.values(specs)

  const completedSpecsCount = specsReports.reduce((acum: number, specReport: SpecReport) => {
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
