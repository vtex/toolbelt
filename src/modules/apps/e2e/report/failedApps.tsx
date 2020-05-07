import * as React from 'react'
import { Box, Color, Text } from 'ink'

import { SpecReport, SpecTestReport, Screenshot } from '../../../../clients/Tester'
import { SessionManager } from '../../../../lib/session/SessionManager'

interface SpecDetailProps {
  label: string
  text: string
  indented: boolean
}

const FailedSpecDetail: React.FunctionComponent<SpecDetailProps> = ({ label, text, indented }) => {
  const textLines = text.split('\n')
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text>
        <Text underline>{`${label}:`}</Text>
        {!indented && ` ${text}`}
      </Text>
      {indented && (
        <Box marginTop={1}>
          <Box flexDirection="column">{textLines.map(() => '│ ')}</Box>
          <Box>{text}</Box>
        </Box>
      )}
    </Box>
  )
}

interface SpecProps {
  spec: string
  report: SpecReport
  hubTestId: string
}

export const FailedSpec: React.FunctionComponent<SpecProps> = ({ spec, report, hubTestId }) => {
  const { logId } = report
  const { specId } = report

  const video = report.report?.video
  const screenshots = report.report?.screenshots
  const notPassedSpecs = (report.report?.tests ?? []).filter(({ state }) => state !== 'passed')

  const errorsVisualization = notPassedSpecs.map(({ title, testId, body, error, stack }, index) => {
    const testScreenshots = screenshots.filter(curScreenshot => curScreenshot.testId === testId)
    return (
      <ErrorVisualization
        key={index}
        title={title}
        body={body}
        error={error}
        stack={stack}
        testScreenshots={testScreenshots}
        testVideo={video}
        specId={specId}
        testId={hubTestId}
      />
    )
  })

  return (
    <Box flexDirection="column">
      <Color bold>{`${spec}:`}</Color>
      <Box flexDirection="column" marginLeft={2}>
        {report.error && <FailedSpecDetail label="Error" text={report.error} indented />}
        {errorsVisualization}
        {specId && <FailedSpecDetail label="SpecId" text={specId} indented={false} />}
        {logId && <FailedSpecDetail label="LogId" text={logId} indented={false} />}
      </Box>
    </Box>
  )
}

interface ErrorVisualizationProps {
  title: SpecTestReport['title']
  body: SpecTestReport['body']
  error: SpecTestReport['error']
  stack: SpecTestReport['stack']

  testScreenshots: Screenshot[]
  testVideo: string
  specId: string
  testId: string
}

const ErrorVisualization: React.FunctionComponent<ErrorVisualizationProps> = ({
  title,
  body,
  error,
  stack,
  testScreenshots,
  testVideo,
  specId,
  testId,
}) => {
  const { account, workspace } = SessionManager.getSingleton()
  const testScreenshotsUrl = testScreenshots
    .map(
      curScreenshot =>
        `${workspace}--${account}.myvtex.com/_v/screenshot/${testId}/${specId}/${curScreenshot.screenshotId}`
    )
    .join('\n')
  const videoUrl = testVideo === 'true' ? `${workspace}--${account}.myvtex.com/_v/video/${testId}/${specId}` : 'false'
  return (
    <Box key={title.join('')} flexDirection="column">
      <FailedSpecDetail label="Test" text={title.join(' ')} indented={false} />
      {body && <FailedSpecDetail label="Body" text={body} indented />}
      {stack && <FailedSpecDetail label="Stack" text={stack} indented />}
      {error && <FailedSpecDetail label="Error" text={error} indented />}
      {testScreenshots.length > 0 && (
        <FailedSpecDetail label="Screenshots" text={testScreenshotsUrl} indented={testScreenshots.length > 1} />
      )}
      {testVideo && <FailedSpecDetail label="Video" text={videoUrl} indented={false} />}
    </Box>
  )
}
