import { readdir, readJson, ensureDir, writeJson, stat, remove } from 'fs-extra'
import { randomBytes } from 'crypto'
import { isArray } from 'util'
import * as lockfile from 'lockfile'
import { join, basename, dirname } from 'path'
import glob from 'globby'

import { TelemetryClient } from '../../clients/telemetryClient'
import { region } from '../env'
import userAgent from '../user-agent'
import { createIOContext, createTelemetryClient } from '../clients'
import { SessionManager } from '../session/SessionManager'
import { TelemetryLocalStore } from './TelemetryStore'
import { ErrorReport } from '../error/ErrorReport'
import { TelemetryCollector } from './TelemetryCollector'
import { ErrorKinds } from '../error/ErrorKinds'
import { MetricReport } from '../metrics/MetricReport'

class FileLock {
  public readonly lockName: string

  constructor(private lockPath: string, private options: any) {
    this.lockName = basename(lockPath)
  }

  public async lock() {
    await ensureDir(dirname(this.lockPath))
    return new Promise((resolve, reject) => {
      lockfile.lock(this.lockPath, this.options, err => {
        err ? reject(err) : resolve()
      })
    })
  }

  public async unlock() {
    return new Promise((resolve, reject) => {
      lockfile.unlock(this.lockPath, err => {
        err ? reject(err) : resolve()
      })
    })
  }
}

export class TelemetryReporter {
  private static readonly RETRIES = 3

  private static readonly TIMEOUT = 30 * 1000

  private static MAX_TELEMETRY_DIR_SIZE = 10 * 1000 * 1000

  public static readonly PENDING_DATA_DIR = join(TelemetryCollector.TELEMETRY_LOCAL_DIR, 'pendingData')

  public static getTelemetryReporter() {
    const { account, workspace, token } = SessionManager.getSessionManager()
    const telemetryClient = createTelemetryClient(
      createIOContext({
        account,
        workspace,
        authToken: token,
        userAgent,
        region: region(),
      }),
      { retries: TelemetryReporter.RETRIES, timeout: TelemetryReporter.TIMEOUT }
    )

    return new TelemetryReporter(telemetryClient, TelemetryReporter.PENDING_DATA_DIR)
  }

  private dataPendingLock: FileLock

  constructor(private telemetryClient: TelemetryClient, private pendingDataDir: string) {
    const dataPendingLockName = 'reporter.lock'
    const dataPendingLockPath = join(pendingDataDir, dataPendingLockName)
    this.dataPendingLock = new FileLock(dataPendingLockPath, {})
  }

  public async reportTelemetryFile(telemetryObjFilePath: string) {
    const telemetryObj = await readJson(telemetryObjFilePath)
    await this.reportErrors(telemetryObj.errors)
    await this.reportMetrics(telemetryObj.metrics)
    await remove(telemetryObjFilePath)
  }

  public async sendPendingData() {
    await this.dataPendingLock.lock()

    const errors = []

    const pendingErrorsFiles = await this.pendingFilesPaths('errors')
    const pendingMetricsFiles = await this.pendingFilesPaths('metrics')
    await Promise.all(
      pendingErrorsFiles.map(async pendingErrorsFile => {
        try {
          const pendingErrorsObject = await readJson(pendingErrorsFile)
          await this.reportErrors(pendingErrorsObject)
          await remove(pendingErrorsFile)
        } catch (err) {
          errors.push(err)
        }
      })
    )
    await Promise.all(
      pendingMetricsFiles.map(async pendingMetricsFile => {
        try {
          const pendingMetricsObject = await readJson(pendingMetricsFile)
          await this.reportMetrics(pendingMetricsObject)
          await remove(pendingMetricsFile)
        } catch (err) {
          errors.push(err)
        }
      })
    )

    if (errors.length > 0) {
      await this.createTelemetryReporterMetaError(errors)
    }

    await this.dataPendingLock.unlock()
  }

  public async reportErrors(errors: ErrorReport[]) {
    try {
      await this.telemetryClient.reportErrors(errors)
    } catch (err) {
      await this.treatReportError(err, 'errors', errors)
    }
  }

  public async reportMetrics(metrics: MetricReport[]) {
    try {
      await this.telemetryClient.reportMetrics(metrics)
    } catch (err) {
      await this.treatReportError(err, 'metrics', metrics)
    }
  }

  public async createTelemetryReporterMetaError(errors: any) {
    const errorArray = isArray(errors) ? errors : [errors]
    const metaErrorFilePath = join(this.pendingDataDir, 'errors', randomBytes(8).toString('hex'))
    const errorsReport = errorArray.map(error => {
      if (!(error instanceof ErrorReport)) {
        return ErrorReport.create({
          kind: ErrorKinds.TELEMETRY_REPORTER_ERROR,
          originalError: error,
        }).toObject()
      }
      return error
    })
    await ensureDir(join(TelemetryReporter.PENDING_DATA_DIR, 'errors'))
    await writeJson(metaErrorFilePath, errorsReport)
  }

  public async ensureTelemetryDirMaxSize() {
    const telemetryFiles = await glob('**', { cwd: TelemetryCollector.TELEMETRY_LOCAL_DIR, absolute: true })
    let telemetryDirSize = 0
    await Promise.all(
      telemetryFiles.map(async file => {
        const fileStats = await stat(file)
        telemetryDirSize += fileStats.size
      })
    )
    if (telemetryDirSize > TelemetryReporter.MAX_TELEMETRY_DIR_SIZE) {
      await remove(TelemetryCollector.TELEMETRY_LOCAL_DIR)
    }
  }

  private async treatReportError(reportError, reportType: 'metrics', metrics: MetricReport[])

  private async treatReportError(reportError, reportType: 'errors', errors: ErrorReport[])

  private async treatReportError(reportError, reportType, metricsOrErrors) {
    await this.dataPendingLock.lock()
    await ensureDir(join(TelemetryReporter.PENDING_DATA_DIR, reportType))
    await writeJson(
      join(TelemetryReporter.PENDING_DATA_DIR, reportType, randomBytes(8).toString('hex')),
      metricsOrErrors
    )
    await this.createTelemetryReporterMetaError(reportError)
    await this.dataPendingLock.unlock()
  }

  private async pendingFilesPaths(fileTypes: 'metrics' | 'errors') {
    const pendingDataDir = join(TelemetryReporter.PENDING_DATA_DIR, fileTypes)
    await ensureDir(pendingDataDir)
    const pendingFiles = await readdir(pendingDataDir)
    return pendingFiles.map(pendingFile => join(pendingDataDir, pendingFile))
  }
}

const start = async () => {
  const store = new TelemetryLocalStore(process.argv[2])
  const telemetryObjFilePath = process.argv[3]
  const reporter = TelemetryReporter.getTelemetryReporter()

  await reporter.reportTelemetryFile(telemetryObjFilePath)
  await reporter.sendPendingData()
  await reporter.ensureTelemetryDirMaxSize()

  store.setLastRemoteFlush(Date.now())
  process.exit()
}

if (require.main === module) {
  start()
}
