import { randomBytes } from 'crypto'
import log from './../../logger'

export class TraceConfig {
    public static jeagerDebugID: string
    public static traceFlag = false
    
    public static setShouldTrace(){
        this.traceFlag = true
        this.jeagerDebugID = randomBytes(8).toString('hex')
        log.info(`Trace Debug ID: ${this.jeagerDebugID}`)
    }

    public static checkTrace(traceFlag: Boolean){
        if(traceFlag){
            this.setShouldTrace()
        }
    }

    public static shouldTrace(): Boolean {
       return this.traceFlag
    }
    
}