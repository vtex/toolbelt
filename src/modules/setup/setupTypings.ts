import chalk from 'chalk'
import R from 'ramda'
import { publicEndpoint } from '../../env'
import { Builder } from '../../lib/clients/IOClients/apps/Builder'
import { ErrorKinds } from '../../lib/error/ErrorKinds'
import { ErrorReport } from '../../lib/error/ErrorReport'
import { SessionManager } from '../../lib/session/SessionManager'
import { toMajorRange } from '../../locator'
import log from '../../logger'
import { appIdFromRegistry, isLinked, resolveAppId } from '../apps/utils'
import { runYarn } from '../utils'
import { BUILDERS_WITH_TYPES } from './consts'
import { checkIfTarGzIsEmpty, packageJsonEditor, sortObject } from './utils'

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
        ErrorReport.createAndRegisterOnTelemetry({
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

const getBuilderDependencies = (
  manifestDependencies: Pick<Manifest, 'dependencies'>,
  typingsData: any,
  version: string,
  builder: string
) => {
  const builderTypingsData = R.prop(builder, typingsData)
  let injectedDependencies = {}
  if (builderTypingsData && R.has(version, builderTypingsData)) {
    injectedDependencies = R.path([version, 'injectedDependencies'], builderTypingsData)
  }
  return R.merge(manifestDependencies, injectedDependencies)
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
      ErrorReport.createAndRegisterOnTelemetry({
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
    const buildersWithAllDeps = filteredBuilders.map((builder: string) => {
      return {
        builder,
        deps: {
          ...getBuilderDependencies(manifest.dependencies, typingsData, manifest.builders[builder], builder),
          ...(builder === 'node' ? { [appName]: appMajor } : {}),
        },
      }
    })

    await Promise.all(
      buildersWithAllDeps.map(({ builder, deps }) => injectTypingsInPackageJson(deps, ignoreLinked, builder))
    )
    log.info('Finished setting up typings')
  } catch (err) {
    ErrorReport.createAndRegisterOnTelemetry({
      kind: ErrorKinds.SETUP_TYPINGS_ERROR,
      originalError: err,
    }).logErrorForUser()
  }
}
