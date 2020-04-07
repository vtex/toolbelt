import { ensureDir } from 'fs-extra'
import { basename, dirname } from 'path'
import * as lockfile from 'proper-lockfile'

export class FileLock {
  public static readonly LOCK_STALE_TIME = 60 * 1000

  public readonly lockName: string
  public readonly lockDir: string

  public locked: boolean
  private releaseLock: () => void

  constructor(private lockPath: string) {
    this.lockName = basename(lockPath)
    this.locked = false
  }

  public async lock() {
    if (this.locked) {
      return
    }

    await ensureDir(dirname(this.lockPath))
    try {
      this.releaseLock = await lockfile.lock(dirname(this.lockPath), {
        stale: FileLock.LOCK_STALE_TIME,
        lockfilePath: this.lockPath,
      })

      this.locked = true
    } catch (err) {
      throw err
    }
  }

  public async unlock() {
    if (!this.locked) {
      return
    }

    this.locked = false
    return this.releaseLock?.()
  }
}
