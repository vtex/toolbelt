import {logAll, onEvent} from '../sse'
import {currentContext} from '../conf'
import log from '../logger'
import {BuildFailError} from '../errors'

type BuildEvent = 'start' | 'success' | 'fail' | 'timeout' | 'logs'

const allEvents: BuildEvent[] = ['start', 'success', 'fail', 'timeout', 'logs']

const flowEvents: BuildEvent[] = ['start', 'success', 'fail']

const onBuildEvent = (ctx: Context, appOrKey: string, callback: (type: BuildEvent, message?: Message) => void) => {
  const unlistenLogs = logAll(ctx, log.level, appOrKey.split('@')[0])
  const [unlistenStart, unlistenSuccess, unlistenFail] = flowEvents.map((type) => onEvent(ctx, 'vtex.render-builder', `build.${type}`, (message) => callback(type, message)))
  const timer = setTimeout(() => callback('timeout'), 5000)

  const unlistenMap: Record<BuildEvent, Function> = {
    start: unlistenStart,
    success: unlistenSuccess,
    fail: unlistenFail,
    logs: unlistenLogs,
    timeout: () => clearTimeout(timer),
  }

  return (...types: BuildEvent[]) => {
    types.forEach(type => { unlistenMap[type]() })
  }
}

export const listenBuild = (appOrKey: string, triggerBuild: (unlistenBuild?: (response) => void) => Promise<any>, ctx: Context = currentContext) => {
  return new Promise((resolve, reject) => {
    let triggerResponse

    const unlisten = onBuildEvent(ctx, appOrKey, (eventType, message) => {
      switch (eventType) {
        case 'start':
          unlisten('start', 'timeout')
          break
        case 'success':
        case 'timeout':
          unlisten(...allEvents)
          resolve(triggerResponse)
          break
        case 'fail':
          unlisten(...allEvents)
          reject(new BuildFailError(message))
          break
      }
    })

    const unlistenBuild = (response) => {
      unlisten(...allEvents)
      resolve(response)
    }

    triggerBuild(unlistenBuild)
      .then(response => {
        triggerResponse = response
      })
      .catch(e => {
        unlisten(...allEvents)
        reject(e)
      })
  })
}
