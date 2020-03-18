import { readdir, readJson, ensureDir, ensureFile, writeJson, remove } from 'fs-extra'
import { randomBytes } from 'crypto'
import { isArray } from 'util'
import * as lockfile from 'lockfile'
import { join, basename, dirname } from 'path'

import { TelemetryClient } from '../../clients/telemetryClient'
import { region } from '../../env'
import userAgent from '../../user-agent'
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

    const pendingErrorsFiles = await this.pendingErrorsFilesPaths()
    const pendingMetricsFiles = await this.pendingMetricsFilesPaths()
    await Promise.all(
      pendingErrorsFiles.map(async pendingErrosFile => {
        try {
          const pendingErrorsObject = await readJson(pendingErrosFile)
          await this.reportErrors(pendingErrorsObject)
          await remove(pendingErrosFile)
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

  public async reportErrors(errors: any[]) {
    try {
      await this.telemetryClient.reportErrors(errors)
    } catch (err) {
      await this.dataPendingLock.lock()
      await ensureDir(join(TelemetryReporter.PENDING_DATA_DIR, 'errors'))
      await writeJson(join(TelemetryReporter.PENDING_DATA_DIR, 'errors', randomBytes(8).toString('hex')), errors)
      await this.createTelemetryReporterMetaError(err)
      await this.dataPendingLock.unlock()
    }
  }

  public async reportMetrics(metrics: MetricReport[]) {
    try {
      await this.telemetryClient.reportMetrics(metrics)
    } catch (err) {
      await this.dataPendingLock.lock()
      await ensureDir(join(TelemetryReporter.PENDING_DATA_DIR, 'metrics'))
      await writeJson(join(TelemetryReporter.PENDING_DATA_DIR, 'metrics', randomBytes(8).toString('hex')), metrics)
      await this.createTelemetryReporterMetaError(err)
      await this.dataPendingLock.unlock()
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
    await ensureFile(metaErrorFilePath)
    await writeJson(metaErrorFilePath, { errors: errorsReport })
  }

  private async pendingErrorsFilesPaths() {
    const pendingDataErrorsDir = join(TelemetryReporter.PENDING_DATA_DIR, 'errors')
    await ensureDir(pendingDataErrorsDir)
    const pendingErrorsFiles = await readdir(pendingDataErrorsDir)
    return pendingErrorsFiles.map(pendingErrorFile => join(pendingDataErrorsDir, pendingErrorFile))
  }

  private async pendingMetricsFilesPaths() {
    const pendingDataMetricsDir = join(TelemetryReporter.PENDING_DATA_DIR, 'metrics')
    await ensureDir(pendingDataMetricsDir)
    const pendingMetricsFiles = await readdir(pendingDataMetricsDir)
    return pendingMetricsFiles.map(pendingMetricsFile => join(pendingDataMetricsDir, pendingMetricsFile))
  }
}

const start = async () => {
  const store = new TelemetryLocalStore(process.argv[2])
  const telemetryObjFilePath = process.argv[3]
  const reporter = TelemetryReporter.getTelemetryReporter()

  await reporter.reportTelemetryFile(telemetryObjFilePath)
  await reporter.sendPendingData()

  store.setLastRemoteFlush(Date.now())
  process.exit()
}

if (require.main === module) {
  start()
}
