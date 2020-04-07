import { randomBytes } from 'crypto'
import { ensureDir, move, readdir, remove, stat, writeJson } from 'fs-extra'
import glob from 'globby'
import { join } from 'path'
import { TelemetryMetaMetrics } from '../../metrics/MetricNames'
import { MetricReport } from '../../metrics/MetricReport'
import { FileLock } from '../../utils/FileLock'
import { hrTimeToMs } from '../../utils/hrTimeToMs'
import { TelemetryCollector, TelemetryFile } from '../TelemetryCollector'

export class PendingTelemetryDataManager {
  private static MAX_TELEMETRY_DIR_SIZE = 10 * 1000 * 1000
  public static readonly PENDING_DATA_DIR = join(TelemetryCollector.TELEMETRY_LOCAL_DIR, 'pendingData')

  private static singleton: PendingTelemetryDataManager
  public static getSingleton() {
    if (PendingTelemetryDataManager.singleton) {
      return PendingTelemetryDataManager.singleton
    }

    return new PendingTelemetryDataManager(PendingTelemetryDataManager.PENDING_DATA_DIR)
  }

  private pendingTelemetryFilesToCreate: TelemetryFile[]
  private pendingMetaMetrics: MetricReport
  private dataPendingLock: FileLock

  constructor(private pendingDataDir: string) {
    const dataPendingLockName = 'reporter.lock'
    const dataPendingLockPath = join(pendingDataDir, dataPendingLockName)
    this.dataPendingLock = new FileLock(dataPendingLockPath)

    this.pendingTelemetryFilesToCreate = []
    this.pendingMetaMetrics = MetricReport.create({
      command: 'not-applicable',
    })
  }

  public async acquireLock() {
    const getLockTime = process.hrtime()
    await this.dataPendingLock.lock()
    this.registerPendingMetaMetric(TelemetryMetaMetrics.PENDING_DATA_ACQUIRE_LOCK_TIME, process.hrtime(getLockTime))
  }

  public releaseLock() {
    return this.dataPendingLock.unlock()
  }

  public async ensureTelemetryDirMaxSize() {
    const { totalDirSize } = await this.getPendingDirStats()

    if (totalDirSize > PendingTelemetryDataManager.MAX_TELEMETRY_DIR_SIZE) {
      await remove(TelemetryCollector.TELEMETRY_LOCAL_DIR)
    }
  }

  public async getFilePaths() {
    await ensureDir(this.pendingDataDir)
    const pendingFiles = await readdir(this.pendingDataDir)
    return pendingFiles.map(pendingFile => join(this.pendingDataDir, pendingFile))
  }

  public async moveTelemetryFileToPending(filePath: string) {
    return move(filePath, join(this.pendingDataDir, randomBytes(8).toString('hex')))
  }

  public registerPendingFile(content: TelemetryFile) {
    this.pendingTelemetryFilesToCreate.push(content)
  }

  public registerPendingMetaMetric(metricName: string, latency: [number, number]) {
    this.pendingMetaMetrics.addMetric(metricName, hrTimeToMs(latency))
  }

  public async createPendingFiles() {
    await this.createPendingDirMetrics()
    await ensureDir(this.pendingDataDir)
    this.pendingTelemetryFilesToCreate.push({ metrics: [this.pendingMetaMetrics.toObject()] })

    console.log(this.pendingMetaMetrics.toObject())

    this.pendingMetaMetrics = MetricReport.create({
      command: 'not-applicable1',
    })

    await Promise.all(
      this.pendingTelemetryFilesToCreate.map(async fileContent => {
        try {
          await writeJson(join(this.pendingDataDir, randomBytes(8).toString('hex')), fileContent)
        } catch (err) {}
      })
    )

    this.pendingTelemetryFilesToCreate = []
  }

  private async createPendingDirMetrics() {
    const stats = await this.getPendingDirStats()
    this.pendingMetaMetrics.addMetrics({
      [TelemetryMetaMetrics.PENDING_DATA_FILES]: stats.numberOfFiles,
      [TelemetryMetaMetrics.PENDING_DATA_DIR_SIZE]: stats.totalDirSize,
      [TelemetryMetaMetrics.PENDING_DATA_MAX_FILE_SIZE]: stats.maxFileSize,
    })
  }

  private async getPendingDirStats() {
    const telemetryFiles: string[] = await glob('**', { cwd: TelemetryCollector.TELEMETRY_LOCAL_DIR, absolute: true })
    let maxFileSize = 0
    let telemetryDirSize = 0
    await Promise.all(
      telemetryFiles.map(async file => {
        const fileStats = await stat(file)
        telemetryDirSize += fileStats.size

        if (fileStats.size > maxFileSize) {
          maxFileSize = fileStats.size
        }
      })
    )

    return {
      maxFileSize,
      numberOfFiles: telemetryFiles.length,
      totalDirSize: telemetryDirSize,
    }
  }
}
