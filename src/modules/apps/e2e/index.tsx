import React from 'react'
import { render } from 'ink'

import { apps, tester } from '../../../clients'
import { RealTimeReport } from './report'
import { getToken } from '../../../conf'
import { ManifestEditor } from '../../../lib/manifest/ManifestEditor'
import { ErrorBoundary } from './errorBoundary'

const TEST_WORKSPACE = ''

const resolveAppLocator = async options => {
  if (options.workspace) return TEST_WORKSPACE
  return (await ManifestEditor.getManifestEditor()).appLocator
}

export default async options => {
  const cleanAppId = await resolveAppLocator(options)

  const appId =
    cleanAppId === TEST_WORKSPACE
      ? TEST_WORKSPACE
      : await apps
          .listApps()
          .then(({ data: appList }) => appList.map(({ app }) => app).find(app => app.startsWith(cleanAppId)))

  if (appId === undefined) {
    throw new Error('Workspace was not found!')
  }

  const testRequest = options.report
    ? null
    : await tester.test(
        { integration: true, monitoring: true, authToken: options.token ? getToken() : undefined },
        appId
      )

  const testId = testRequest ? testRequest.testId : (options.report as string)
  const requestedAt = testRequest ? testRequest.requestedAt : null

  const initialReport = await tester.report(testId)

  render(
    <ErrorBoundary>
      <RealTimeReport
        initialReport={initialReport}
        testId={testId}
        poll={() => tester.report(testId)}
        interval={2000}
        requestedAt={requestedAt}
      />
    </ErrorBoundary>,
    process.stdout
  )
}
