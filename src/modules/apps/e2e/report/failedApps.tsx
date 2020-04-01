import * as React from 'react'
import { Box, Color, Text } from 'ink'

import { SpecReport, SpecTestReport, Screenshot } from '../../../../clients/Tester'

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
}

export const FailedSpec: React.FunctionComponent<SpecProps> = ({ spec, report }) => {
    const video = report.report?.video
    const screenshots = report.report?.screenshots
    const notPassedSpecs = (report.report?.tests ?? []).filter(({ state }) => state !== 'passed')
  
    const errorsVisualization = notPassedSpecs.map(({ title, testId, body, error, stack }, index) => {
        const testScreenshots = screenshots.filter(curScreenshot => curScreenshot.testId === testId)
        return (
          <ErrorVisualization key={index} title={title} body={body} error={error} stack={stack} testScreenshots={testScreenshots} />
        )
      })
  
    return (
      <Box flexDirection="column">
        <Color bold>{`${spec}:`}</Color>
        <Box flexDirection="column" marginLeft={2}>
          {report.error && <FailedSpecDetail label={'Error'} text={report.error} indented={true} />}
          {errorsVisualization}
          {video && <FailedSpecDetail label={'Video'} text={video} indented={false} />}
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
  }
  
  const ErrorVisualization: React.FunctionComponent<ErrorVisualizationProps> = ({
    title,
    body,
    error,
    stack,
    testScreenshots,
  }) => {
    const testScreenshotsText = testScreenshots.map(curScreenshot => ' ' + curScreenshot.path).join('\n')
    return (
      <Box key={title.join('')} flexDirection="column">
        <FailedSpecDetail label={'Test'} text={title.join(' ')} indented={false} />
        {body && <FailedSpecDetail label={'Body'} text={body} indented={true} />}
        {stack && <FailedSpecDetail label={'Stack'} text={stack} indented={true} />}
        {error && <FailedSpecDetail label={'Error'} text={error} indented={true} />}
        {testScreenshots.length > 0 && (
          <FailedSpecDetail label={'Screenshots'} text={testScreenshotsText} indented={testScreenshots.length > 1} />
        )}
      </Box>
    )
  }