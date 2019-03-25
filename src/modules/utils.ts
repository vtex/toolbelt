import chalk from 'chalk'
import * as enquirer from 'enquirer'
import { prop } from 'ramda'
import { currentContext } from '../conf'
import { BuildFailError } from '../errors'
import log from '../logger'
import { logAll, onEvent } from '../sse'

interface BuildListeningOptions {
  context?: Context,
  timeout?: number,
}

type BuildEvent = 'start' | 'success' | 'fail' | 'timeout' | 'logs'
type AnyFunction = (...args: any[]) => any

const allEvents: BuildEvent[] = ['start', 'success', 'fail', 'timeout', 'logs']

const flowEvents: BuildEvent[] = ['start', 'success', 'fail']

const onBuildEvent = (ctx: Context, timeout: number, appOrKey: string, callback: (type: BuildEvent, message?: Message) => void) => {
  const [subject] = appOrKey.split('@')
  const unlistenLogs = logAll(ctx, log.level, subject)
  const [unlistenStart, unlistenSuccess, unlistenFail] = flowEvents.map((type) => onEvent(ctx, 'vtex.render-builder', subject, [`build.${type}`], (message) => callback(type, message)))
  const timer = timeout && setTimeout(() => callback('timeout'), timeout)
  const unlistenMap: Record<BuildEvent, AnyFunction> = {
    fail: unlistenFail,
    logs: unlistenLogs,
    start: unlistenStart,
    success: unlistenSuccess,
    timeout: () => clearTimeout(timer),
  }

  return (...types: BuildEvent[]) => {
    types.forEach(type => { unlistenMap[type]() })
  }
}

export const listenBuild = (appOrKey: string, triggerBuild: (unlistenBuild?: (response) => void) => Promise<any>, options: BuildListeningOptions = {}) => {
  return new Promise((resolve, reject) => {
    let triggerResponse

    const { context = currentContext, timeout = 5000 } = options
    const unlisten = onBuildEvent(context, timeout, appOrKey, (eventType, message) => {
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

export const formatNano = (nanoseconds: number): string =>
  `${(nanoseconds / 1e9).toFixed(0)}s ${((nanoseconds / 1e6) % 1e3).toFixed(
    0
  )}ms`


export const promptConfirm = async (message: string, initial=true): Promise<boolean> =>
  enquirer.prompt<any>({
    type: 'confirm',
    name: 'confirm',
    message,
    initial,
    format: (a) => a ? chalk.green('Yes') : chalk.red('No'),
  }).then(prop('confirm'))
