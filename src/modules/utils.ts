import chalk from 'chalk'
import { execSync } from 'child-process-es6-promise'
import { existsSync, readFile} from 'fs-extra'
import { resolve as resolvePath } from 'path'
import { currentContext } from '../conf'
import * as conf from '../conf'
import { BuildFailError } from '../errors'
import log from '../logger'
import { getAppRoot } from '../manifest'
import { logAll, onEvent } from '../sse'
import { promptConfirm } from './prompts'

interface BuildListeningOptions {
  context?: Context,
  timeout?: number,
}


type BuildEvent = 'start' | 'success' | 'fail' | 'timeout' | 'logs'
type AnyFunction = (...args: any[]) => any

const allEvents: BuildEvent[] = ['start', 'success', 'fail', 'timeout', 'logs']

const flowEvents: BuildEvent[] = ['start', 'success', 'fail']

export const yarnPath = `"${require.resolve('yarn/bin/yarn')}"`

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

export const runYarn = (relativePath: string, force: boolean) => {
  log.info(`Running yarn in ${chalk.green(relativePath)}`)
  const root = getAppRoot()
  const command = force ?
    `${yarnPath} --force --non-interactive` :
    `${yarnPath} --non-interactive`
  execSync(
    command,
    {stdio: 'inherit', cwd: resolvePath(root, relativePath)}
  )
  log.info('Finished running yarn')
}

export const runYarnIfPathExists = (relativePath: string) => {
  const root = getAppRoot()
  const pathName = resolvePath(root, relativePath)
  if (existsSync(pathName)) {
    try {
      runYarn(relativePath, false)
    } catch (e) {
      log.error(`Failed to run yarn in ${chalk.green(relativePath)}`)
      throw e
    }
  }
}

interface PackageDependencies {
  dependencies: [string] : string
}

export const checkPinnedDependencies = async (relativePath: string, pinnedDeps: [Record<string, string>]) => {
  const content : any = await readFile(`${relativePath}/package.json`).toJSON()
  map(content.dependencies,
}

const getSwitchAccountMessage = (previousAccount: string, currentAccount = conf.getAccount()) :string => {
  return `Now you are logged in ${chalk.blue(currentAccount)}. Do you want to return to ${chalk.blue(previousAccount)} account?`
}

export const switchToPreviousAccount = async (previousConf: any) => {
  const previousAccount = previousConf.account
  if (previousAccount !== conf.getAccount()) {
    const canSwitchToPrevious = await promptConfirm(getSwitchAccountMessage(previousAccount))
    if (canSwitchToPrevious) {
      conf.saveAll(previousConf)
    }
  }
}
