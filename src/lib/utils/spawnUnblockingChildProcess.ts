import { spawn } from 'child_process'
import { EnvVariablesConstants } from '../constants/EnvVariablesConstants'

export function spawnUnblockingChildProcess(path: string, args: string[]) {
  const debugMode = !!process.env[EnvVariablesConstants.DEBUG_CP]
  console.log('Debug mode', debugMode)

  console.log(args)
  const proc = spawn(path, args, debugMode ? { stdio: 'inherit' } : { detached: true, stdio: 'ignore' })
  if (!debugMode) {
    proc.unref()
  }

  return proc
}
