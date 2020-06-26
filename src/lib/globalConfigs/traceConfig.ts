import { randomBytes } from 'crypto'
import log from '../../api/logger'

export class TraceConfig {
  public static jaegerDebugID: string
  public static traceFlag = false

  public static setShouldTrace() {
    this.traceFlag = true
    this.jaegerDebugID = `toolbelt-${randomBytes(8).toString('hex')}`
    log.info(`Trace Debug ID: ${this.jaegerDebugID}`)
  }

  public static setupTraceConfig(traceFlag: boolean) {
    if (traceFlag) {
      this.setShouldTrace()
    }
  }

  public static shouldTrace(): boolean {
    return this.traceFlag
  }
}
