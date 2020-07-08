import { randomBytes } from 'crypto'
import { ensureDir, move, readdir, remove, stat, writeJson } from 'fs-extra'
import glob from 'globby'
import { join } from 'path'
import { TelemetryMetaMetrics } from '../../../api/metrics/MetricNames'
import { MetricReport } from '../../../api/metrics/MetricReport'
import { FileLock } from '../../../lib/utils/FileLock'
import { hrTimeToMs } from '../../../lib/utils/hrTimeToMs'
import { TelemetryCollector, TelemetryFile } from '../TelemetryCollector'

export class PendingTelemetryDataManager {
  public static readonly PENDING_DATA_DIR = join(TelemetryCollector.TELEMETRY_LOCAL_DIR, 'pendingData')
  private static readonly MAX_TELEMETRY_DIR_SIZE = 10 * 1000 * 1000
  private static readonly MAX_TELEMETRY_DIR_NUMBER_OF_FILES = 500

  private static singleton: PendingTelemetryDataManager
  public static getSingleton() {
    if (!PendingTelemetryDataManager.singleton) {
      PendingTelemetryDataManager.singleton = new PendingTelemetryDataManager(
        PendingTelemetryDataManager.PENDING_DATA_DIR
      )
    }

    return PendingTelemetryDataManager.singleton
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
    const { totalDirSize, numberOfFiles } = await this.getPendingDirStats()

    if (
      totalDirSize > PendingTelemetryDataManager.MAX_TELEMETRY_DIR_SIZE ||
      numberOfFiles > PendingTelemetryDataManager.MAX_TELEMETRY_DIR_NUMBER_OF_FILES
    ) {
      await remove(TelemetryCollector.TELEMETRY_LOCAL_DIR)
    }
  }

  public async getFilePaths() {
    await ensureDir(this.pendingDataDir)
    const pendingFiles = (await readdir(this.pendingDataDir)).filter(
      fileName => fileName !== this.dataPendingLock.lockName
    )

    return pendingFiles.map(pendingFile => join(this.pendingDataDir, pendingFile))
  }

  public async moveTelemetryFileToPending(filePath: string) {
    return move(filePath, this.newPendingFilePath())
  }

  public registerPendingFile(content: TelemetryFile) {
    this.pendingTelemetryFilesToCreate.push(content)
  }

  public registerPendingMetaMetric(metricName: string, latency: [number, number]) {
    this.pendingMetaMetrics.addMetric(metricName, hrTimeToMs(latency))
  }

  public async createPendingFiles() {
    await ensureDir(this.pendingDataDir)
    this.flushPendingMetaMetrics()

    await Promise.all(
      this.pendingTelemetryFilesToCreate.map(async fileContent => {
        try {
          await writeJson(this.newPendingFilePath(), fileContent)
        } catch (err) {
          // At this point there's nothing much we can do, we just console.error for when the child_process is being investigated
          console.error(err)
        }
      })
    )

    this.pendingTelemetryFilesToCreate = []
  }

  public async createPendingDirMetrics() {
    const stats = await this.getPendingDirStats()
    this.pendingMetaMetrics.addMetrics({
      [TelemetryMetaMetrics.PENDING_DATA_FILES]: stats.numberOfFiles,
      [TelemetryMetaMetrics.PENDING_DATA_DIR_SIZE]: stats.totalDirSize,
      [TelemetryMetaMetrics.PENDING_DATA_MAX_FILE_SIZE]: stats.maxFileSize,
    })
  }

  private newPendingFilePath() {
    return join(this.pendingDataDir, randomBytes(8).toString('hex'))
  }

  private flushPendingMetaMetrics() {
    this.pendingTelemetryFilesToCreate.push({ metrics: [this.pendingMetaMetrics.toObject()] })
    this.pendingMetaMetrics = MetricReport.create({
      command: 'not-applicable',
    })
  }

  private async getPendingDirStats() {
    const pendingFiles: string[] = await glob('**', { cwd: this.pendingDataDir, absolute: true })
    let maxFileSize = 0
    let pendingDirSize = 0
    await Promise.all(
      pendingFiles.map(async file => {
        const fileStats = await stat(file)
        pendingDirSize += fileStats.size

        if (fileStats.size > maxFileSize) {
          maxFileSize = fileStats.size
        }
      })
    )

    return {
      maxFileSize,
      numberOfFiles: pendingFiles.length,
      totalDirSize: pendingDirSize,
    }
  }
}
