import chalk from 'chalk'
import { execSync } from 'child-process-es6-promise'
import { diffArrays } from 'diff'
import { existsSync } from 'fs-extra'
import { resolve as resolvePath } from 'path'
import R from 'ramda'
import { dummyLogger } from '../clients/dummyLogger'
import * as conf from '../conf'
import * as env from '../env'
import { BuildFailError } from '../errors'
import log from '../logger'
import { getAppRoot } from '../manifest'
import { logAll, onEvent } from '../sse'
import { createTable } from '../table'
import envTimeout from '../timeout'
import userAgent from '../user-agent'
import { promptConfirm } from './prompts'

interface BuildListeningOptions {
  context?: Context
  timeout?: number
}

type BuildEvent = 'start' | 'success' | 'fail' | 'timeout' | 'logs'
type AnyFunction = (...args: any[]) => any

const allEvents: BuildEvent[] = ['start', 'success', 'fail', 'timeout', 'logs']

const flowEvents: BuildEvent[] = ['start', 'success', 'fail']

export const yarnPath = `"${require.resolve('yarn/bin/yarn')}"`

const DEFAULT_TIMEOUT = 10000

export const IOClientOptions = {
  timeout: (envTimeout || DEFAULT_TIMEOUT) as number,
  retries: 3,
}

export const getIOContext = () => ({
  account: conf.getAccount(),
  authToken: conf.getToken(),
  production: false,
  product: '',
  region: env.region(),
  route: {
    id: '',
    params: {},
  },
  userAgent,
  workspace: conf.getWorkspace(),
  requestId: '',
  operationId: '',
  logger: dummyLogger,
  platform: '',
})

const onBuildEvent = (
  ctx: Context,
  timeout: number,
  appOrKey: string,
  callback: (type: BuildEvent, message?: Message) => void
) => {
  const [subject] = appOrKey.split('@')
  const unlistenLogs = logAll(ctx, log.level, subject)
  const [unlistenStart, unlistenSuccess, unlistenFail] = flowEvents.map(type =>
    onEvent(ctx, 'vtex.render-builder', subject, [`build.${type}`], message => callback(type, message))
  )
  const timer = timeout && setTimeout(() => callback('timeout'), timeout)
  const unlistenMap: Record<BuildEvent, AnyFunction> = {
    fail: unlistenFail,
    logs: unlistenLogs,
    start: unlistenStart,
    success: unlistenSuccess,
    timeout: () => clearTimeout(timer),
  }

  return (...types: BuildEvent[]) => {
    types.forEach(type => {
      unlistenMap[type]()
    })
  }
}

export const listenBuild = (
  appOrKey: string,
  triggerBuild: (unlistenBuild?: (response) => void) => Promise<any>,
  options: BuildListeningOptions = {}
) => {
  return new Promise((resolve, reject) => {
    let triggerResponse

    const { context = conf.currentContext, timeout = 5000 } = options
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

    const unlistenBuild = response => {
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
  `${(nanoseconds / 1e9).toFixed(0)}s ${((nanoseconds / 1e6) % 1e3).toFixed(0)}ms`

export const runYarn = (relativePath: string, force: boolean) => {
  log.info(`Running yarn in ${chalk.green(relativePath)}`)
  const root = getAppRoot()
  const command = force
    ? `${yarnPath} --force --non-interactive --ignore-engines`
    : `${yarnPath} --non-interactive --ignore-engines`
  execSync(command, { stdio: 'inherit', cwd: resolvePath(root, relativePath) })
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

const getSwitchAccountMessage = (previousAccount: string, currentAccount = conf.getAccount()): string => {
  return `Now you are logged in ${chalk.blue(currentAccount)}. Do you want to return to ${chalk.blue(
    previousAccount
  )} account?`
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

const formatAppId = (appId: string) => {
  const [appVendor, appName] = R.split('.', appId)
  if (!appName) {
    // Then the app is an 'infra' app.
    const [infraAppVendor, infraAppName] = R.split(':', appId)
    if (!infraAppName) {
      return appId
    }
    return `${chalk.blue(infraAppVendor)}:${infraAppName}`
  }
  return `${chalk.blue(appVendor)}.${appName}`
}

const cleanVersion = (appId: string) => {
  return R.compose<string, string[], string, string>(
    (version: string) => {
      const [pureVersion, build] = R.split('+build', version)
      return build ? `${pureVersion}(linked)` : pureVersion
    },
    R.last,
    R.split('@')
  )(appId)
}

export const matchedDepsDiffTable = (title1: string, title2: string, deps1: string[], deps2: string[]) => {
  const depsDiff = diffArrays(deps1, deps2)
  // Get deduplicated names (no version) of the changed deps.
  const depNames = [
    ...new Set(
      R.compose<string[], any[], string[], string[], string[]>(
        R.map(k => R.head(R.split('@', k))),
        R.flatten,
        R.pluck('value'),
        R.filter((k: any) => !!k.removed || !!k.added)
      )(depsDiff)
    ),
  ].sort()
  const produceStartValues = () => R.map(_ => [])(depNames) as any
  // Each of the following objects will start as a { `depName`: [] }, ... }-like.
  const addedDeps = R.zipObj(depNames, produceStartValues())
  const removedDeps = R.zipObj(depNames, produceStartValues())

  // Custom function to set the objects values.
  const setObjectValues = (obj, formatter, filterFunction) => {
    R.compose<void, any[], any[], any[], any[]>(
      R.map(k => {
        const index = R.head(R.split('@', k))
        obj[index].push(formatter(k))
      }),
      R.flatten,
      R.pluck('value'),
      R.filter(filterFunction)
    )(depsDiff)
    R.mapObjIndexed((_, index) => {
      obj[index] = obj[index].join(',')
    })(obj)
  }

  // Setting the objects values.
  setObjectValues(
    removedDeps,
    k => chalk.red(`${cleanVersion(k)}`),
    (k: any) => !!k.removed
  )
  setObjectValues(
    addedDeps,
    k => chalk.green(`${cleanVersion(k)}`),
    (k: any) => !!k.added
  )

  const table = createTable() // Set table headers.
  table.push(['', chalk.bold.yellow(title1), chalk.bold.yellow(title2)])

  const formattedDepNames = R.map(formatAppId, depNames)
  // Push array of changed dependencies pairs to the table.
  Array.prototype.push.apply(
    table,
    R.map((k: any[]) => R.flatten(k))(
      R.zip(
        // zipping 3 arrays.
        R.zip(formattedDepNames, R.values(removedDeps)),
        R.values(addedDeps)
      )
    )
  )
  return table
}
