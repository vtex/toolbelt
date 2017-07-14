import {logAll, onEvent} from '../sse'
import log from '../logger'

export const listenBuildSuccess = (appOrKey, callback) => {
  const timeout = setTimeout(() => {
    unlistenStart()
    unlistenSuccess()
    unlistenFail()
    callback()
  }, 5000)
  const unlistenLogs = logAll(log.level, appOrKey.split('@')[0])
  const unlistenStart = onEvent('vtex.render-builder', 'build.start', () => {
    clearTimeout(timeout)
    unlistenStart()
  })
  const unlistenSuccess = onEvent('vtex.render-builder', 'build.success', () => {
    unlistenLogs()
    unlistenSuccess()
    unlistenFail()
    callback()
  })
  const unlistenFail = onEvent('vtex.render-builder', 'build.fail', () => {
    unlistenLogs()
    unlistenSuccess()
    unlistenFail()
    callback(true)
  })
}
