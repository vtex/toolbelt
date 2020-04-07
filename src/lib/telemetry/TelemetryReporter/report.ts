const initTime = process.hrtime()

import { TelemetryMetaMetrics } from '../../metrics/MetricNames'
import { SessionManager } from '../../session/SessionManager'
import { TelemetryLocalStore } from '../TelemetryStore'
import { PendingTelemetryDataManager } from './PendingTelemetryDataManager'
import { TelemetryReporter } from './TelemetryReporter'

const reportTelemetry = async () => {
  const starTime = process.hrtime()

  const telemetryObjFilePath = process.argv[3]
  const reporter = TelemetryReporter.getTelemetryReporter()

  const { account, workspace, tokenObj } = SessionManager.getSessionManager()

  const pendingDataManager = PendingTelemetryDataManager.getSingleton()
  pendingDataManager.registerPendingMetaMetric(TelemetryMetaMetrics.START_TIME, process.hrtime(initTime))

  if (!account || !workspace || !tokenObj.isValid()) {
    console.log('just move')
    await reporter.moveTelemetryFileToPendingData(telemetryObjFilePath)
  } else {
    console.log('report')
    await reporter.reportTelemetryFile(telemetryObjFilePath)
    await reporter.sendPendingData()
  }

  pendingDataManager.registerPendingMetaMetric(TelemetryMetaMetrics.REPORT_TIME, process.hrtime(starTime))
}

const prepareNewPendingFiles = async () => {
  const pendingDataManager = PendingTelemetryDataManager.getSingleton()
  try {
    await pendingDataManager.acquireLock()
    await pendingDataManager.ensureTelemetryDirMaxSize()
    await pendingDataManager.createPendingFiles()
    await pendingDataManager.releaseLock()
  } catch (err) {}
}

const start = async () => {
  const store = new TelemetryLocalStore(process.argv[2])
  await reportTelemetry()
  await prepareNewPendingFiles()
  store.setLastRemoteFlush(Date.now())
  process.exit()
}

if (require.main === module) {
  start()
}
