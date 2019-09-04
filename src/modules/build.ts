import { currentContext } from '../conf'
import { BuildFailError } from '../errors'
import log from '../logger'
import { logAll, onEvent } from '../sse'

interface ListeningOptions {
  context?: Context
  waitCompletion?: boolean
  onBuild?: AnyFunction
  onError?: { [code: string]: AnyFunction }
  senders?: string[]
}

type BuildTrigger<T> = () => Promise<T>

interface ListenResponse<T> {
  response: T
  unlisten: Unlisten
}

type AnyFunction = (...args: any[]) => any
type BuildEvent = 'logs' | 'build.status'

const allEvents: BuildEvent[] = ['logs', 'build.status']

const onBuildEvent = (
  ctx: Context,
  appOrKey: string,
  callback: (type: BuildEvent, message?: Message) => void,
  senders?: string[]
) => {
  const unlistenLogs = logAll(ctx, log.level, appOrKey, senders)
  const unlistenBuild = onEvent(ctx, 'vtex.builder-hub', appOrKey, ['build.status'], message =>
    callback('build.status', message)
  )
  const unlistenMap: Record<BuildEvent, AnyFunction> = {
    'build.status': unlistenBuild,
    logs: unlistenLogs,
  }

  return (...types: BuildEvent[]) => {
    types.forEach(type => {
      unlistenMap[type]()
    })
  }
}

const runErrorAction = (code, message, errorActions) => {
  const action = errorActions[code]
  if (action) {
    action()
  } else {
    log.error(`App build failed with message: ${message}`)
  }
}

const listen = (appOrKey: string, options: ListeningOptions = {}): Promise<Unlisten> => {
  return new Promise((resolve, reject, onCancel) => {
    const { waitCompletion, onError = {}, onBuild = false, context = currentContext, senders = null } = options
    const callback = (eventType, eventData) => {
      if (eventType === 'build.status') {
        const {
          body: { code, details, message },
        } = eventData
        if (code === 'success') {
          if (waitCompletion) {
            unlisten(...allEvents) // eslint-disable-line @typescript-eslint/no-use-before-define
            resolve(() => undefined)
          }
          if (onBuild) {
            onBuild()
          }
        }

        if (code === 'fail') {
          runErrorAction(details.errorCode, message, onError)
          if (waitCompletion) {
            unlisten(...allEvents) // eslint-disable-line @typescript-eslint/no-use-before-define
            reject(new BuildFailError(eventData))
          }
        }
      }
    }
    const unlisten = onBuildEvent(context, appOrKey, callback, senders)
    const unlistenAll = () => unlisten(...allEvents)
    onCancel(unlistenAll)
    if (!waitCompletion) {
      resolve(unlistenAll)
    }
  })
}

export const listenBuild = async <T = void>(
  appOrKey: string,
  triggerBuild: BuildTrigger<T>,
  options: ListeningOptions = {}
): Promise<ListenResponse<T>> => {
  const listenPromise = listen(appOrKey, options)
  try {
    const response = await triggerBuild()
    const unlisten = await listenPromise
    return { response, unlisten }
  } catch (e) {
    listenPromise.cancel()
    throw e
  }
}
