import * as R from 'ramda'
import { createClients } from '../../clients'
import { getAccount, getWorkspace } from '../../conf'
import { publicEndpoint } from '../../env'
import log from '../../logger'
import { isLinked, resolveAppId } from '../apps/utils'
import { runYarn } from '../utils'
import { packageJsonEditor } from './utils'

const getVendor = (appId: string) => appId.split('.')[0]

const typingsPath = 'public/_types'
const typingsURLRegex = /_v\/\w*\/typings/

const appTypingsURL = async (appName: string, appVersion: string, builder: string): Promise<string> => {
  const appId = await resolveAppId(appName, appVersion)
  const vendor = getVendor(appId)
  if (isLinked({ version: appId, vendor, name: '', builders: {} })) {
    return `https://${getWorkspace()}--${getAccount()}.${publicEndpoint()}/_v/private/typings/linked/v1/${appId}/${typingsPath}/${builder}`
  }
  return `http://${vendor}.vteximg.com.br/_v/public/typings/v1/${appId}/${typingsPath}/${builder}`
}

const appsWithTypingsURLs = async (builder: string, appDependencies: Record<string, any>) => {
  const result: Record<string, any> = {}
  const appNamesAndDependencies = R.toPairs(appDependencies)
  await Promise.all(
    appNamesAndDependencies.map(async ([appName, appVersion]: [string, string]) => {
      try {
        result[appName] = await appTypingsURL(appName, appVersion, builder)
      } catch (e) {
        log.error(`Unable to generate typings URL for ${appName}@${appVersion}.`)
      }
    })
  )

  return result
}

const getDepsInjectedByBuilderHub = (typingsData: any, version: string, builder: string) => {
  const builderTypingsData = R.prop(builder, typingsData)
  if (builderTypingsData && R.has(version, builderTypingsData)) {
    return R.path([version, 'injectedDependencies'], builderTypingsData)
  }
  return null
}

const injectTypingsInPackageJson = async (appDeps: Record<string, any>, builder: string) => {
  let packageJson
  try {
    packageJson = packageJsonEditor.read(builder)
  } catch (e) {
    if (e.code === 'ENOENT') {
      log.warn(`No package.json found in ${packageJsonEditor.path(builder)}.`)
    } else log.error(e)
    return
  }

  log.info(`Injecting typings on ${builder}'s package.json`)
  const oldDevDeps = packageJson.devDependencies || {}
  const oldTypingsEntries = R.filter(R.test(typingsURLRegex), oldDevDeps)
  const newTypingsEntries = await appsWithTypingsURLs(builder, appDeps)
  if (!R.equals(oldTypingsEntries, newTypingsEntries)) {
    const cleanOldDevDeps = R.reject(R.test(typingsURLRegex), oldDevDeps)
    packageJsonEditor.write(builder, {
      ...packageJson,
      ...{ devDependencies: { ...cleanOldDevDeps, ...newTypingsEntries } },
    })
    try {
      runYarn(builder, true)
    } catch (e) {
      log.error(`Error running Yarn in ${builder}.`)
      packageJsonEditor.write(builder, packageJson) // Revert package.json to original state.
    }
  }
}

export const setupTypings = async (manifest: Manifest) => {
  const { builder: builderClient } = createClients({}, { retries: 2 })

  log.info('Fetching names of dependencies injected by BuilderHub')
  const typingsData = await builderClient.typingsInfo()
  const buildersWithInjectedDeps = R.pipe(
    R.prop('builders'),
    R.mapObjIndexed(R.curry(getDepsInjectedByBuilderHub)(typingsData)),
    R.reject(R.isNil)
  )(manifest)

  const buildersWithAppDepsAndInjectedDeps = R.pipe(
    R.mapObjIndexed(injectedDependencies => R.merge(manifest.dependencies, injectedDependencies)),
    R.reject(R.isEmpty)
  )(buildersWithInjectedDeps as Record<string, any>)

  await Promise.all(
    R.pipe(
      R.mapObjIndexed(injectTypingsInPackageJson),
      R.values
    )(buildersWithAppDepsAndInjectedDeps as Record<string, any>)
  )
}
