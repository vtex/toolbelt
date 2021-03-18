import chalk from 'chalk'
import R from 'ramda'
import { publicEndpoint } from '../../api/env'
import { Builder } from '../../api/clients/IOClients/apps/Builder'
import { ErrorKinds } from '../../api/error/ErrorKinds'
import { ErrorReport } from '../../api/error/ErrorReport'
import { SessionManager } from '../../api/session/SessionManager'
import { toMajorRange } from '../../api/locator'
import log from '../../api/logger'
import { appIdFromRegistry, isLinked, resolveAppId } from '../../api/modules/utils'
import { runYarn } from '../utils'
import { BUILDERS_WITH_TYPES } from './consts'
import { checkIfTarGzIsEmpty, packageJsonEditor, sortObject } from './utils'
import { TypingsInfo } from 'BuilderHub'

const getVendor = (appId: string) => appId.split('.')[0]
const typingsURLRegex = /_v\/\w*\/typings/

const appTypingsURL = async (appName: string, appMajorLocator: string, ignoreLinked: boolean): Promise<string> => {
  const { workspace, account } = SessionManager.getSingleton()

  const appId = ignoreLinked
    ? await appIdFromRegistry(appName, appMajorLocator)
    : await resolveAppId(appName, appMajorLocator)

  const vendor = getVendor(appId)
  const linked = isLinked({ version: appId, vendor, name: '', builders: {} })

  const oldSuffix = `/_types/react`
  const newSuffix = `/@types/${appName}`

  const base =
    linked && !ignoreLinked
      ? `https://${workspace}--${account}.${publicEndpoint()}/_v/private/typings/linked/v1/${appId}/public`
      : `http://${vendor}.vtexassets.com/_v/public/typings/v1/${appId}/public`

  log.info(`Checking if ${chalk.bold(appId)} has new types format`)
  try {
    const newTypesExist = !(await checkIfTarGzIsEmpty(base + newSuffix))
    return base + (newTypesExist ? newSuffix : oldSuffix)
  } catch (err) {
    log.error(`Error checking if types package is empty for ${base + newSuffix}`)
    throw err
  }
}

const appsWithTypingsURLs = async (appDependencies: Record<string, any>, ignoreLinked: boolean) => {
  const result: Record<string, any> = {}
  const appNamesAndDependencies = R.toPairs(appDependencies)
  await Promise.all(
    appNamesAndDependencies.map(async ([appName, appVersion]: [string, string]) => {
      try {
        result[appName] = await appTypingsURL(appName, appVersion, ignoreLinked)
      } catch (err) {
        log.error(`Unable to generate typings URL for ${appName}@${appVersion}.`)
        ErrorReport.createAndMaybeRegisterOnTelemetry({
          kind: ErrorKinds.SETUP_TYPINGS_ERROR,
          originalError: err,
        }).logErrorForUser({
          coreLogLevelDefault: 'debug',
          logLevels: { core: { errorId: 'error' } },
        })
      }
    })
  )

  return result
}

export const getBuilderDependencies = (
  manifestDependencies: Pick<Manifest, 'dependencies' | 'peerDependencies'>,
  typingsData: TypingsInfo,
  version: string,
  builder: string
) => {
  const injectedDependencies = typingsData?.[builder]?.[version]?.injectedDependencies || {}
  return {
    ...manifestDependencies.dependencies,
    ...manifestDependencies.peerDependencies,
    ...injectedDependencies,
  }
}

const injectTypingsInPackageJson = async (appDeps: Record<string, any>, ignoreLinked: boolean, builder: string) => {
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
  const newTypingsEntries = await appsWithTypingsURLs(appDeps, ignoreLinked)
  if (!R.equals(oldTypingsEntries, newTypingsEntries)) {
    const cleanOldDevDeps = R.reject(R.test(typingsURLRegex), oldDevDeps)
    packageJsonEditor.write(builder, {
      ...packageJson,
      ...{ devDependencies: sortObject({ ...cleanOldDevDeps, ...newTypingsEntries }) },
    })
    try {
      runYarn(builder, true)
    } catch (e) {
      log.error(`Error running Yarn in ${builder}.`)
      ErrorReport.createAndMaybeRegisterOnTelemetry({
        kind: ErrorKinds.SETUP_TSCONFIG_ERROR,
        originalError: e,
      })

      packageJsonEditor.write(builder, packageJson) // Revert package.json to original state.
    }
  }
}

export const setupTypings = async (
  manifest: Manifest,
  ignoreLinked: boolean,
  buildersWithTypes = BUILDERS_WITH_TYPES
) => {
  log.info('Setting up typings')
  const appName = `${manifest.vendor}.${manifest.name}`
  const appMajor = toMajorRange(manifest.version)

  const builderClient = Builder.createClient({}, { retries: 2, timeout: 10000 })
  const builders = R.keys(R.prop('builders', manifest) || {})
  const filteredBuilders = R.intersection(builders, buildersWithTypes)

  try {
    log.info('Fetching names of dependencies injected by BuilderHub')
    const typingsData = await builderClient.typingsInfo()
    const allDependencies: Pick<Manifest, 'dependencies' | 'peerDependencies'> = {
      dependencies: manifest.dependencies,
      peerDependencies: manifest.peerDependencies,
    }

    const shouldIncludeSelfAsDevDependency = builder => ['node', 'react'].includes(builder)

    const buildersWithAllDeps = filteredBuilders.map((builder: string) => {
      return {
        builder,
        deps: {
          ...getBuilderDependencies(allDependencies, typingsData, manifest.builders[builder], builder),
          ...(shouldIncludeSelfAsDevDependency(builder) ? { [appName]: appMajor } : {}),
        },
      }
    })

    await Promise.all(
      buildersWithAllDeps.map(({ builder, deps }) => injectTypingsInPackageJson(deps, ignoreLinked, builder))
    )
    log.info('Finished setting up typings')
  } catch (err) {
    ErrorReport.createAndMaybeRegisterOnTelemetry({
      kind: ErrorKinds.SETUP_TYPINGS_ERROR,
      originalError: err,
    }).logErrorForUser()
  }
}
