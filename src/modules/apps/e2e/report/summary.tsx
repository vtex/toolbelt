import * as React from 'react'
import { Box, Color, Text } from 'ink'
import { values, countBy, sum } from 'ramda'

import { passedApp, countPassedSpecs, ReportProps } from './index'

interface SummaryProps extends ReportProps {
    testId: string
    requestedAt?: number
}
  
export const Summary: React.FunctionComponent<SummaryProps> = ({ completed, running, testId, requestedAt }) => {
    const { pass = 0, fail = 0 } = countBy(([, ar]) => (passedApp(ar) ? 'pass' : 'fail'), completed)
    const passSpecs =
        sum(completed.map(([, ar]) => countPassedSpecs(ar))) + sum(running.map(([, ar]) => countPassedSpecs(ar)))
    const totalSpecs = sum(completed.map(([, ar]) => values(ar).length)) + sum(running.map(([, ar]) => values(ar).length))

    const [timePassed, setTimePassed] = React.useState(requestedAt ? Math.floor((Date.now() - requestedAt) / 1000) : null)

    React.useEffect(() => {
        if (timePassed == null || running.length === 0) return
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
            <Color greenBright>{pass} passed</Color>, {pass} of {pass + fail} total
            </Text>
            <Text>
            <Color greenBright>{passSpecs} passed</Color>, {passSpecs} of {totalSpecs} total
            </Text>
            {timePassed ? <Text>{`${timePassed}s`}</Text> : null}
        </Box>
        </React.Fragment>
    )
}