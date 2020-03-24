import React from 'react'
import { render } from 'ink'

import { apps, tester } from '../../../clients'
import { RealTimeReport } from './report'
import { getToken } from '../../../conf'
import { ManifestEditor } from '../../../lib/manifest/ManifestEditor'
import { ErrorBoundary } from './errorBoundary'
import { TestRequest } from '../../../clients/Tester'


export default async options => {
  new EndToEndCommand(options).run()
}

class EndToEndCommand {
  options : any

  constructor(options) {
    this.options = options
  }
  public run() {
    if(this.options.workspace) {
      return this.runWorkspaceTests()
    }

    return this.runAppTests()
  }

  private async runAppTests() {
    const manifestEditor = await ManifestEditor.getManifestEditor()
    const cleanAppId = manifestEditor.appLocator

    const appList = await apps.listApps()
    const appId = appList.data.map(({ app }) => app).find(app => app.startsWith(cleanAppId))
  
    if (appId === undefined) {
      throw new Error('App was not found!')
    }
  
    const testRequest = this.options.report
      ? null
      : await tester.test(
          { integration: true, monitoring: true, authToken: this.options.token ? getToken() : undefined },
          appId
        )
  
    this.render(testRequest)
  }

  private async runWorkspaceTests() {
    const testRequest = this.options.report
      ? null
      : await tester.test(
          { integration: true, monitoring: true, authToken: this.options.token ? getToken() : undefined }
        )
    
    this.render(testRequest)
  }

  private async render( testRequest: TestRequest ) {
    const testId = testRequest ? testRequest.testId : (this.options.report as string)
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
}