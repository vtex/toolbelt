import * as React from 'react'
import { Box } from 'ink'
import { difference} from 'ramda'

import { TestReport } from '../../../../clients/Tester'
import { useInterval } from '../useInterval'
import { Summary } from './summary'
import { ReportProps, parseReport, Report } from './index'

type RealTimeReport = {
    testId: string
    poll: () => Promise<TestReport>
    interval: number
    initialReport: TestReport
    requestedAt?: number
  }

export const RealTimeReport: React.FunctionComponent<RealTimeReport> = ({
    testId,
    poll,
    interval,
    initialReport,
    requestedAt,
  }) => {
    const [delay, setDelay] = React.useState(interval)
    const [report, setReport] = React.useState<ReportProps>(parseReport(initialReport))
  
    const handleReport = ({ completed, running }: ReportProps) => {
      const recentlyCompleted = difference(completed, report.completed)
  
      setReport({
        // careful not to reorder completed apps because they are Static
        completed: [...report.completed, ...recentlyCompleted],
        running,
      })
  
      if (running.length === 0) setDelay(null)
    }
  
    useInterval(
      () =>
        poll()
          .then(parseReport)
          .then(handleReport),
      delay
    )
  
    return (
      <Box flexDirection="column">
        <Report {...report} />
        <Box marginTop={1}>
          <Summary {...report} testId={testId} requestedAt={requestedAt} />
        </Box>
      </Box>
    )
  }