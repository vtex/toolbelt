import chalk from 'chalk'

import { createAppsClient } from '../../../api/clients/IOClients/infra/Apps'
import { Tester, TestRequest, AppReport } from '../../../api/clients/IOClients/apps/Tester'
import { ManifestEditor } from '../../../api/manifest/ManifestEditor'
import { SessionManager } from '../../../api/session/SessionManager'
import { parseReport, AppTest, passedApp } from './specsState'
import { parseLocator } from '../../../api/locator'
import logger from '../../../api/logger'
import { clusterIdDomainInfix, publicEndpoint } from '../../../api/env'

const POLL_INTERVAL = 2000

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

    if (appItem === undefined) {
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

    return this.watch(testRequest)
  }

  private workspaceBaseUrl() {
    const { account, workspace } = SessionManager.getSingleton()
    return `https://${workspace}--${account}${clusterIdDomainInfix()}.${publicEndpoint()}`
  }

  private reportUrl(testId: string) {
    return `${this.workspaceBaseUrl()}/_v/report/${testId}/html`
  }

  private async runWorkspaceTests() {
    const testRequest = this.options.report
      ? null
      : await this.tester.test({
          integration: true,
          monitoring: true,
          authToken: this.options.token ? SessionManager.getSingleton().token : undefined,
        })

    return this.watch(testRequest)
  }

  private async watch(testRequest: TestRequest | null) {
    const testId = testRequest ? testRequest.testId : (this.options.report as string)
    const completedApps: Set<string> = new Set()

    logger.info(chalk.bold('TestId: ') + testId)
    logger.info('Tests running. You will be notified upon each app completion.')

    const timer = setInterval(async () => {
      const report = await this.tester.report(testId)
      const { completedAppTests, runningAppTests } = parseReport(report)
      for (const test of completedAppTests) {
        if (completedApps.has(test.appId)) {
          continue
        }
        completedApps.add(test.appId)
        this.notifyApp(test)
      }
      if (runningAppTests.length > 0) {
        return
      }
      logger.info(`Tests completed! Find the complete report at ${chalk.underline(this.reportUrl(testId))}`)
      clearInterval(timer)
    }, POLL_INTERVAL)
  }

  private notifyApp(app: AppTest) {
    const { appId, specs } = app
    logger.info(`${this.appState(specs)} ${this.appName(appId)}`)
  }

  private appState(specs: AppReport) {
    return passedApp(specs) ? chalk.green('PASS') : chalk.red('FAIL')
  }

  private appName(appId: string) {
    const { vendor, name, version } = parseLocator(appId)

    return `${chalk.blue(vendor)}${chalk.gray.bold('.')}${name}@${version}`
  }
}

export default options => {
  return new EndToEndCommand(options).run()
}
