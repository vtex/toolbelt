import { ensureDir } from 'fs-extra'
import { basename, dirname } from 'path'
import * as lockfile from 'proper-lockfile'

export class FileLock {
  public static readonly LOCK_STALE_TIME = 5 * 60 * 1000

  public readonly lockName: string
  public readonly lockDir: string

  public locked: boolean
  private releaseLock: () => Promise<void>

  constructor(private lockPath: string) {
    this.lockName = basename(lockPath)
    this.lockDir = dirname(this.lockPath)
    this.locked = false
  }

  public async lock() {
    if (this.locked) {
      return
    }

    await ensureDir(this.lockDir)
    this.releaseLock = await lockfile.lock(this.lockDir, {
      stale: FileLock.LOCK_STALE_TIME,
      lockfilePath: this.lockPath,
    })

    this.locked = true
  }

  public unlock() {
    if (!this.locked) {
      return
    }

    this.locked = false
    return this.releaseLock?.()
  }
}
