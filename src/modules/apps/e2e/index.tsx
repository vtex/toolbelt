import React from 'react'
import { render } from 'ink'

import { apps, tester } from '../../../clients'
import { RealTimeReport } from './report/realTime'
import { getToken } from '../../../conf'
import { ManifestEditor } from '../../../lib/manifest/ManifestEditor'
import { ErrorBoundary } from './ErrorBoundary'
import { TestRequest } from '../../../clients/Tester'


export default options => {
  return new EndToEndCommand(options).run()
}

class EndToEndCommand {
  constructor(private options) {}

  public run() {
    if(this.options.workspace) {
      return this.runWorkspaceTests()
    }

    return this.runAppTests()
  }

  private async runAppTests() {
    const manifestEditor = await ManifestEditor.getManifestEditor()
    const cleanAppId = manifestEditor.appLocator

    const { data: workspaceAppsList }= await apps.listApps()
    const app = workspaceAppsList.find( ({ app }) => app.startsWith(cleanAppId))
  
    if (app.id === undefined) {
      throw new Error(`App "${cleanAppId}" was not found in the current workspace!`)
    }
  
    const testRequest = this.options.report
      ? null
      : await tester.test(
          { integration: true, monitoring: true, authToken: this.options.token ? getToken() : undefined },
          app.id
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

  private async render( testRequest: TestRequest | null) {
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
    )
  }
}