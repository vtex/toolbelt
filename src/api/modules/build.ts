import { BuildFailError } from '../error/errors'
import log, { fileLoggerLevel } from '../logger'
import { logAll, onEvent } from '../../lib/sse'
import { SessionManager } from '../session/SessionManager'

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
type BuildEvent = 'logs' | 'build.status' | 'receive.status'

const allEvents: BuildEvent[] = ['logs', 'build.status', 'receive.status']

const onBuildEvent = (
  ctx: Context,
  appOrKey: string,
  callback: (type: BuildEvent, message?: Message) => void,
  senders?: string[]
) => {
  const unlistenLogs = logAll(ctx, fileLoggerLevel(), appOrKey, senders)
  const unlistenBuild = onEvent(ctx, 'vtex.builder-hub', appOrKey, ['build.status'], message =>
    callback('build.status', message)
  )
  const unlistenReceive = onEvent(ctx, 'vtex.builder-hub', appOrKey, ['receive.status'], message =>
    callback('receive.status', message)
  )

  const unlistenMap: Record<BuildEvent, AnyFunction> = {
    'build.status': unlistenBuild,
    'receive.status': unlistenReceive,
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
  const listenPromise = new Promise((resolve, reject) => {
    const { account, workspace } = SessionManager.getSingleton()
    const { waitCompletion, onError = {}, onBuild = false, context = { account, workspace }, senders = null } = options
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

      if (eventType === 'receive.status') {
        const transfered = parseFloat(eventData.body.bytesTransferred)
        const total = parseFloat(eventData.body.totalBytes)
        const percentage = Math.round((100 * transfered) / total)

        log.info(
          `Sending files: ${percentage}% - ${(transfered / 1000000).toFixed(2)}MB/${(total / 1000000).toFixed(2)}MB`
        )
      }
    }

    const unlisten = onBuildEvent(context, appOrKey, callback, senders)
    const unlistenAll = () => unlisten(...allEvents)
    if (!waitCompletion) {
      resolve(unlistenAll)
    }
  }) as Promise<Unlisten>
  return listenPromise
}

export const listenBuild = async <T = void>(
  appOrKey: string,
  triggerBuild: BuildTrigger<T>,
  options: ListeningOptions = {}
): Promise<ListenResponse<T>> => {
  const listenPromise = listen(appOrKey, options)
  const response = await triggerBuild()
  const unlisten = await listenPromise
  return { response, unlisten }
}
