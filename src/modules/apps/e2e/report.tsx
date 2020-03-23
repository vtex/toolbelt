import * as React from 'react'
import { Box, Color, Text, Static } from 'ink'
import { all, difference, groupBy, toPairs, values, countBy, sum, pathOr, path } from 'ramda'
import { parseAppId } from '@vtex/api'

import { SpecReport, AppReport, TestReport, SpecTestReport, Screenshot } from '../../../clients/Tester'
import { useInterval } from './useInterval'

type AppIdProps = {
  appId: string
}

const AppId: React.FunctionComponent<AppIdProps> = ({ appId }) => {
  const { name, version, build } = parseAppId(appId)
  const [vendor, app] = name.split('.')
  return (
    <Box>
      <Color blue>{vendor}</Color>
      <Color dim>.</Color>
      {`${app}@${version}`}
      {build && <Color dim>{`-${build}`}</Color>}
    </Box>
  )
}

type SpecDetailProps = {
  label: string
  text: string
  indented: boolean
}

const FailedSpecDetail: React.FunctionComponent<SpecDetailProps> = ({ label, text, indented }) => {
  const nLines = text.split('\n')
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text>
        <Text underline>{`${label}:`}</Text>
        {!indented && ` ${text}`}
      </Text>
      {indented && (
        <Box marginTop={1}>
          <Box flexDirection="column">{nLines.map(() => '│ ')}</Box>
          <Box>{text}</Box>
        </Box>
      )}
    </Box>
  )
}

type SpecProps = {
  spec: string
  report: SpecReport
}

const FailedSpec: React.FunctionComponent<SpecProps> = ({ spec, report }) => {
  const video = path<string>(['report', 'video'], report)
  const screenshots = path<Screenshot[]>(['report', 'screenshots'], report)
  return (
    <Box flexDirection="column">
      <Color bold>{`${spec}:`}</Color>
      <Box flexDirection="column" marginLeft={2}>
        {report.error && <FailedSpecDetail label={'Error'} text={report.error} indented={true} />}
        {...pathOr<SpecTestReport[], SpecTestReport[]>([] as SpecTestReport[], ['report', 'tests'], report)
          .filter(({ state }) => state !== 'passed')
          .map(({ testId, title, body, stack, error }) => {
            const _screenshots = screenshots.filter(ss => ss.testId === testId)
            return (
              <Box key={title.join('')} flexDirection="column">
                <FailedSpecDetail label={'Test'} text={title.join(' ')} indented={false} />
                {body && <FailedSpecDetail label={'Body'} text={body} indented={true} />}
                {stack && <FailedSpecDetail label={'Stack'} text={stack} indented={true} />}
                {error && <FailedSpecDetail label={'Error'} text={error} indented={true} />}
                {_screenshots.length > 0 && (
                  <FailedSpecDetail
                    label={'Screenshots'}
                    text={_screenshots.map(ss => ' ' + ss.path).join('\n')}
                    indented={_screenshots.length > 1}
                  />
                )}
              </Box>
            )
          })}
        {video && <FailedSpecDetail label={'Video'} text={video} indented={false} />}
      </Box>
    </Box>
  )
}

const completedAppColors = (fail: [string, SpecReport][]) => {
  if (fail.length === 0) return { bgGreen: true, black: true }
  return { bgRed: true, white: true }
}

type AppProps = {
  appId: string
  specs: AppReport
}

const Completed: React.FunctionComponent<AppProps> = ({ appId, specs }) => {
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

const Running: React.FunctionComponent<AppProps> = ({ appId, specs }) => {
  const specsReports = values(specs)
  const { running = specsReports.length, completed = 0 } = countBy(
    sr => (completedSpec(sr) ? 'completed' : 'running'),
    specsReports
  )
  return (
    <Box>
      <Color bgYellow black>
        {' RUNS '}
      </Color>
      <Box marginLeft={1}>
        <AppId appId={appId} />
      </Box>
      <Box marginLeft={1}>
        <Color greenBright>{`${completed} specs completed`}</Color>
        <Text>{`, ${running + completed} total`}</Text>
      </Box>
    </Box>
  )
}

type ReportProps = {
  completed: Array<[string, AppReport]>
  running: Array<[string, AppReport]>
}

const completedStates = ['passed', 'failed', 'skipped', 'error']

const completedSpec = (sr: SpecReport) => completedStates.includes(sr.state)
const completedApp = (ar: AppReport) => all(completedSpec, values(ar))

const passedSpec = (sr: SpecReport) => sr.state === 'passed'
const passedApp = (ar: AppReport) => all(passedSpec, values(ar))

const countPassedSpecs = (ar: AppReport) => sum(values(ar).map(sr => Number(passedSpec(sr))))

type SummaryProps = ReportProps & {
  testId: string
  requestedAt?: number
}

const Summary: React.FunctionComponent<SummaryProps> = ({ completed, running, testId, requestedAt }) => {
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

const Report: React.FunctionComponent<ReportProps> = ({ completed, running }) => (
  <Box flexDirection="column">
    <Static>
      {completed.map(([appId, specs]) => (
        <Completed key={appId} appId={appId} specs={specs} />
      ))}
    </Static>

    {running.length > 0 && (
      <Box flexDirection="column" marginTop={1}>
        {running.map(([appId, specs]) => (
          <Running key={appId} appId={appId} specs={specs} />
        ))}
      </Box>
    )}
  </Box>
)

type RealTimeReport = {
  testId: string
  poll: () => Promise<TestReport>
  interval: number
  initialReport: TestReport
  requestedAt?: number
}

const parseReport = (report: TestReport): ReportProps => {
  const { completed = [], running = [] } = groupBy(
    ([, specs]) => (completedApp(specs) ? 'completed' : 'running'),
    toPairs(report)
  )
  return { completed, running }
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
