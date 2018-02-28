import {currentContext} from '../conf'
import {BuildFailError} from '../errors'
import log from '../logger'
import {logAll, onEvent} from '../sse'

interface ListeningOptions {
  context?: Context,
  waitCompletion?: boolean,
  onError?: {[code: string]: Function},
}

type BuildTrigger<T> = () => Promise<T>

interface ListenResponse<T> {
  response: T,
  unlisten: Unlisten
}

type BuildEvent = 'logs' | 'build.status'

const allEvents: BuildEvent[] = ['logs', 'build.status']

const onBuildEvent = (ctx: Context, appOrKey: string, callback: (type: BuildEvent, message?: Message) => void) => {
  const [subject] = appOrKey.split('@')
  const unlistenLogs = logAll(ctx, log.level, subject)
  const unlistenBuild = onEvent(ctx, 'vtex.builder-hub', subject, ['build.status'], message => callback('build.status', message))
  const unlistenMap: Record<BuildEvent, Function> = {
    'build.status': unlistenBuild,
    logs: unlistenLogs,
  }

  return (...types: BuildEvent[]) => {
    types.forEach(type => { unlistenMap[type]() })
  }
}

const runErrorAction = (code, errorActions) => {
  const action = errorActions[code]
  if (action) {
    action()
  }
}

const listen = (appOrKey: string, options: ListeningOptions = {}): Promise<Unlisten> => {
  return new Promise((resolve, reject, onCancel) => {
    const {waitCompletion, onError = {}, context = currentContext} = options
    const unlisten = onBuildEvent(context, appOrKey, (eventType, message) => {
      if (eventType === 'build.status') {
        const {body: {code, details}} = message
        if (code === 'success' && waitCompletion) {
          unlisten(...allEvents)
          resolve(() => {})
        }

        if (code === 'fail') {
          runErrorAction(details.errorCode, onError)
          if (waitCompletion) {
            unlisten(...allEvents)
            reject(new BuildFailError(message))
          }
        }
      }
    })

    const unlistenAll = () => unlisten(...allEvents)
    onCancel(unlistenAll)
    if (!waitCompletion) {
      resolve(unlistenAll)
    }
  })
}

export const listenBuild = async <T = void> (appOrKey: string, triggerBuild: BuildTrigger<T>, options: ListeningOptions = {}): Promise<ListenResponse<T>> => {
  const listenPromise = listen(appOrKey, options)
  try {
    const response = await triggerBuild()
    const unlisten = await listenPromise
    return {response, unlisten}
  } catch (e) {
    listenPromise.cancel()
    throw e
  }
}
