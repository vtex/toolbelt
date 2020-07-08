const initTime = process.hrtime()

import { TelemetryMetaMetrics } from '../../../api/metrics/MetricNames'
import { SessionManager } from '../../../api/session/SessionManager'
import { TelemetryLocalStore } from '../TelemetryStore'
import { PendingTelemetryDataManager } from './PendingTelemetryDataManager'
import { TelemetryReporter } from './TelemetryReporter'

const reportTelemetry = async () => {
  const reportTime = process.hrtime()
  const telemetryObjFilePath = process.argv[3]
  const reporter = TelemetryReporter.getTelemetryReporter()
  const { account, workspace, tokenObj } = SessionManager.getSingleton()

  if (!account || !workspace || !tokenObj.isValid()) {
    await reporter.moveTelemetryFileToPendingData(telemetryObjFilePath)
  } else {
    await reporter.reportTelemetryFile(telemetryObjFilePath)
    await reporter.sendPendingData()
  }

  PendingTelemetryDataManager.getSingleton().registerPendingMetaMetric(
    TelemetryMetaMetrics.REPORT_TIME,
    process.hrtime(reportTime)
  )
}

const prepareNewPendingFiles = async () => {
  const pendingDataManager = PendingTelemetryDataManager.getSingleton()
  try {
    await pendingDataManager.acquireLock()
    await pendingDataManager.createPendingFiles()
    await pendingDataManager.ensureTelemetryDirMaxSize()
    await pendingDataManager.releaseLock()
  } catch (err) {
    // At this point there's nothing much we can do, we just console.error for when the child_process is being investigated
    console.error(err)
  }
}

const start = async () => {
  const store = new TelemetryLocalStore(process.argv[2])
  PendingTelemetryDataManager.getSingleton().registerPendingMetaMetric(
    TelemetryMetaMetrics.START_TIME,
    process.hrtime(initTime)
  )

  await reportTelemetry()
  await prepareNewPendingFiles()
  store.setLastRemoteFlush(Date.now())
  process.exit()
}

if (require.main === module) {
  process.on('exit', () => console.log('Finished reporting telemetry'))
  start()
}
