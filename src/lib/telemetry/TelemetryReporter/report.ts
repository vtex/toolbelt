const initTime = process.hrtime()

import { TelemetryMetaMetrics } from '../../metrics/MetricNames'
import { SessionManager } from '../../session/SessionManager'
import { hrTimeToMs } from '../../utils/hrTimeToMs'
import { TelemetryLocalStore } from '../TelemetryStore'
import { PendingTelemetryDataManager } from './PendingTelemetryDataManager'
import { TelemetryReporter } from './TelemetryReporter'
import { createLog } from '../../utils/scriptLogging'

const log = createLog('telemetry')

const reportTelemetry = async () => {
  const reportTime = process.hrtime()
  const telemetryObjFilePath = process.argv[3]
  const reporter = TelemetryReporter.getTelemetryReporter()
  const { account, workspace, tokenObj } = SessionManager.getSessionManager()

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
  log({ event: 'start', time: hrTimeToMs(process.hrtime(initTime)) })
  const store = new TelemetryLocalStore(process.argv[2])
  PendingTelemetryDataManager.getSingleton().registerPendingMetaMetric(
    TelemetryMetaMetrics.START_TIME,
    process.hrtime(initTime)
  )

  await reportTelemetry()
  log({ event: 'reported', time: hrTimeToMs(process.hrtime(initTime)) })
  await prepareNewPendingFiles()
  log({ event: 'preparedPendingFiles', time: hrTimeToMs(process.hrtime(initTime)) })

  store.setLastRemoteFlush(Date.now())
  process.exit()
}

if (require.main === module) {
  process.on('exit', () => log({ event: 'finish', time: hrTimeToMs(process.hrtime(initTime)) }))
  start()
}
