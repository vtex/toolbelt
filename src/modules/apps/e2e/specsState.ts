import { SpecReport, AppReport, TestReport } from '../../../lib/clients/IOClients/apps/Tester'

const COMPLETED_STATES = ['passed', 'failed', 'skipped', 'error']

export interface AppTest {
  appId: string
  specs: AppReport
}

export const completedSpec = (specReport: SpecReport) => COMPLETED_STATES.includes(specReport.state)
const completedApp = (appReport: AppReport) => {
  return Object.values(appReport).every((specReport: SpecReport) => {
    return completedSpec(specReport)
  })
}

export const passedSpec = (specReport: SpecReport) => specReport.state === 'passed'
export const passedApp = (appReport: AppReport) => {
  return Object.values(appReport).every((specReport: SpecReport) => {
    return passedSpec(specReport)
  })
}

export const parseReport = (report: TestReport) => {
  const appTests: AppTest[] = Object.keys(report).map(appId => {
    return {
      appId,
      specs: report[appId],
    }
  })

  const completedAppTests = appTests.filter(appTest => completedApp(appTest.specs))
  const runningAppTests = appTests.filter(appTest => !completedApp(appTest.specs))
  return { completedAppTests, runningAppTests }
}
