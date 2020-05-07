import { render } from 'ink'
import React from 'react'
import { createAppsClient } from '../../../lib/clients/Apps'
import { Tester, TestRequest } from '../../../lib/clients/Tester'
import { ManifestEditor } from '../../../lib/manifest/ManifestEditor'
import { SessionManager } from '../../../lib/session/SessionManager'
import { RealTimeReport } from './report/index'

class EndToEndCommand {
  private tester: Tester
  constructor(private options) {
    this.tester = Tester.createClient()
  }

  public run() {
    if (this.options.workspace) {
      return this.runWorkspaceTests()
    }

    return this.runAppTests()
  }

  private async runAppTests() {
    const manifestEditor = await ManifestEditor.getManifestEditor()
    const cleanAppId = manifestEditor.appLocator

    const apps = createAppsClient()
    const { data: workspaceAppsList } = await apps.listApps()
    const appItem = workspaceAppsList.find(({ app }) => app.startsWith(cleanAppId))

    if (appItem.id === undefined) {
      throw new Error(`App "${cleanAppId}" was not found in the current workspace!`)
    }

    const testRequest = this.options.report
      ? null
      : await this.tester.test(
          {
            integration: true,
            monitoring: true,
            authToken: this.options.token ? SessionManager.getSingleton().token : undefined,
          },
          appItem.id
        )

    this.render(testRequest)
  }

  private async runWorkspaceTests() {
    const testRequest = this.options.report
      ? null
      : await this.tester.test({
          integration: true,
          monitoring: true,
          authToken: this.options.token ? SessionManager.getSingleton().token : undefined,
        })

    this.render(testRequest)
  }

  private async render(testRequest: TestRequest | null) {
    const testId = testRequest ? testRequest.testId : (this.options.report as string)
    const requestedAt = testRequest ? testRequest.requestedAt : null

    const initialReport = await this.tester.report(testId)

    render(
      <RealTimeReport
        initialReport={initialReport}
        testId={testId}
        poll={() => this.tester.report(testId)}
        interval={2000}
        requestedAt={requestedAt}
      />
    )
  }
}

export default options => {
  return new EndToEndCommand(options).run()
}
