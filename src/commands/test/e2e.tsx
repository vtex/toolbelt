import React from 'react'
import { flags } from '@oclif/command'
import { render } from 'ink'

import { apps, tester } from '../../clients'
import { getToken } from '../../conf'
import { ManifestEditor } from '../../lib/manifest/ManifestEditor'
import { TestRequest } from '../../clients/Tester'
import { CustomCommand } from '../../lib/CustomCommand'
import { RealTimeReport } from '../../lib/test/e2e/report/index'

class EndToEndCommand {
  constructor(private options) {}

  public run() {
    if (this.options.workspace) {
      return this.runWorkspaceTests()
    }

    return this.runAppTests()
  }

  private async runAppTests() {
    const manifestEditor = await ManifestEditor.getManifestEditor()
    const cleanAppId = manifestEditor.appLocator

    const { data: workspaceAppsList } = await apps.listApps()
    const appItem = workspaceAppsList.find(({ app }) => app.startsWith(cleanAppId))

    if (appItem.id === undefined) {
      throw new Error(`App "${cleanAppId}" was not found in the current workspace!`)
    }

    const testRequest = this.options.report
      ? null
      : await tester.test(
          { integration: true, monitoring: true, authToken: this.options.token ? getToken() : undefined },
          appItem.id
        )

    this.render(testRequest)
  }

  private async runWorkspaceTests() {
    const testRequest = this.options.report
      ? null
      : await tester.test({
          integration: true,
          monitoring: true,
          authToken: this.options.token ? getToken() : undefined,
        })

    this.render(testRequest)
  }

  private async render(testRequest: TestRequest | null) {
    const testId = testRequest ? testRequest.testId : (this.options.report as string)
    const requestedAt = testRequest ? testRequest.requestedAt : null

    const initialReport = await tester.report(testId)

    render(
      <RealTimeReport
        initialReport={initialReport}
        testId={testId}
        poll={() => tester.report(testId)}
        interval={2000}
        requestedAt={requestedAt}
      />
    )
  }
}

export default class E2E extends CustomCommand {
  static description = 'Start a development session for this app'

  static aliases = ['e2e', 'test:e2e']
  static examples = []

  static flags = {
    help: flags.help({ char: 'h' }),
    report: flags.string({ char: 'r', description: 'Check the results and state of a previously started test given its ID' }),
    workspace: flags.boolean({ char: 'w', description: "Test workspace's apps", default: false }),
    token: flags.boolean({
      char: 't',
      description: "[Not recommended] Send your personal authorization token to your test session so it's available while running the tests. It can be dangerous because exposes the token via 'authToken' environment variable",
      default: false,
    })
  }

  static args = []

  async run() {
    const { flags } = this.parse(E2E)

    return new EndToEndCommand(flags).run()
  }
}
