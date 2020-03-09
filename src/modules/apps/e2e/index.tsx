import React from 'react'
import { Color, render } from 'ink'

import log from '../../../logger'
import { apps, tester } from '../../../clients'
import { getManifest, writeManifestSchema } from '../../../manifest'
import { toAppLocator } from '../../../locator'
import RealTimeReport from './report'
import { getToken } from '../../../conf'

class ErrorBoundary extends React.Component<{}, { error: any }> {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { error }
  }

  componentDidCatch(_error, _errorInfo) {
    // You can also log the error to an error reporting service
    // logErrorToMyService(error, errorInfo);
  }

  render() {
    if (this.state.error != null) {
      // You can render any custom fallback UI
      return <Color red>{this.state.error.message}</Color>
    }

    return this.props.children
  }
}

const TEST_WORKSPACE = ''

const resolveAppLocator = async options => {
  if (options.workspace) return TEST_WORKSPACE
  const manifest = await getManifest()
  try {
    await writeManifestSchema()
  } catch (e) {
    log.debug('Failed to write schema on manifest.')
  }
  return toAppLocator(manifest)
}

export default async options => {
  // await validateAppAction('e2e')
  const cleanAppId = await resolveAppLocator(options)

  const appId =
    cleanAppId === TEST_WORKSPACE
      ? TEST_WORKSPACE
      : await apps
          .listApps()
          .then(({ data: appList }) => appList.map(({ app }) => app).find(app => app.startsWith(cleanAppId)))

  if (appId === undefined) {
    throw new Error('nao achou no workspace!')
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
