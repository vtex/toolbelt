import * as React from 'react'
import { Box, Color, Text } from 'ink'
import { pathOr } from 'ramda'

import { SpecReport, SpecTestReport } from '../../../../clients/Tester'


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