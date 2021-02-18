import { spawn } from 'child_process'
import { EnvVariablesConstants } from '../constants/EnvVariables'

export function spawnUnblockingChildProcess(path: string, args: string[]) {
  const debugMode = !!process.env[EnvVariablesConstants.DEBUG_CP]

  const proc = spawn(path, args, debugMode ? { stdio: 'inherit' } : { detached: true, stdio: 'ignore' })
  if (!debugMode) {
    proc.unref()
  }

  return proc
}
