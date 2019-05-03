import * as retry from 'async-retry'
import axios from 'axios'
import { execSync } from 'child-process-es6-promise'
import { outputJson, outputJsonSync, pathExists, readJson, readJsonSync } from 'fs-extra'
import { resolve as resolvePath } from 'path'
import { compose, difference, equals, filter, has, intersection, isEmpty, isNil, join, keys, map, mapObjIndexed, merge, mergeDeepRight, path as ramdaPath, pipe, prop, reject as ramdaReject, test, values } from 'ramda'
import { getAccount, getEnvironment, getWorkspace } from '../conf'
import { getToken } from '../conf'
import { publicEndpoint, region } from '../env'
import log from '../logger'
import { getAppRoot, getManifest } from '../manifest'
import { isLinked, resolveAppId } from './apps/utils'

const root = getAppRoot()
const builderHubTypingsInfoTimeout = 2000  // 2 seconds
const buildersToAddAdditionalPackages = ['react', 'node']
const addToPackageJson = {
  'eslint': '^5.15.1',
  'eslint-config-vtex': '^10.1.0',
  'prettier': '^1.16.4',
}
const addToEslintrc = {
  'react': {
    'extends': 'eslint-config-vtex',
    'env': {
      'browser': true,
      'es6': true,
      'jest': true,
    },
  },
  'node': {
    'extends': 'eslint-config-vtex',
    'env': {
      'node': true,
      'es6': true,
      'jest': true,
    },
  },
}
const typingsPath = 'public/_types'
const yarnPath = require.resolve('yarn/bin/yarn')
const typingsURLRegex = /_v\/\w*\/typings/
const getVendor = (appId: string) => appId.split('.')[0]
const builderHttp = (account: string, workspace: string) =>
  axios.create({
    baseURL: `http://builder-hub.vtex.${region()}.vtex.io/${account}/${workspace}`,
    timeout: builderHubTypingsInfoTimeout,
    headers: {
      'Authorization': getToken(),
    },
  })

const resolvePackageJsonPath = (builder: string) => resolvePath(root, `${builder}/package.json`)
const resolveTSConfigPath = (builder: string) => resolvePath(root, `${builder}/tsconfig.json`)
const resolveTSLintPath = (builder: string) => resolvePath(root, `${builder}/.eslintrc`)

const typingsInfo = async (account: string, workspace: string) => {
  const http = builderHttp(account, workspace)
  const retryOpts = {
    retries: 2,
    minTimeout: 1000,
    factor: 2,
  }

  const getTypingsInfo = async (_: any, tryCount: number) => {
    if (tryCount > 1) {
      log.info(`Retrying...${tryCount-1} typings info`)
    }
    try {
    const res = await http.get(`/_v/builder/0/typings`)
    return res.data.typingsInfo
    } catch (err) {
      const statusMessage = err.response.status ?
        `: Status ${err.response.status}` : ''
      log.error(`Error fetching typings info ${statusMessage} (try: ${tryCount})`)
      throw err
    }
  }
  try {
    return retry(getTypingsInfo, retryOpts)
  } catch (e) {
    log.error('Unable to get typings info from vtex.builder-hub.')
    return {}
  }

}

const appTypingsURL = async (account: string, workspace: string, appName: string, appVersion: string, builder: string): Promise<string> => {
  const appId = await resolveAppId(appName, appVersion)
  const vendor = getVendor(appId)
  if (isLinked({'version': appId})) {
  return `https://${workspace}--${account}.${publicEndpoint()}/_v/private/typings/linked/v1/${appId}/${typingsPath}/${builder}`
  }
  return `http://${vendor}.vteximg.com.br/_v/public/typings/v1/${appId}/${typingsPath}/${builder}`
}

const appsWithTypingsURLs = async (builder: string, account: string, workspace: string, appDependencies: Record<string, any>) => {
  const result: Record<string, any> = {}
  for (const [appName, appVersion] of Object.entries(appDependencies)) {
    try {
      result[appName] = await appTypingsURL(account, workspace, appName, appVersion, builder)
    } catch (e) {
      log.error(`Unable to generate typings URL for ${appName}@${appVersion}.`)
    }
  }
  return result
}

const runYarn = (relativePath: string) => {
  log.info(`Running yarn in ${relativePath}`)
  execSync(
    `${yarnPath} --force --non-interactive`,
    {stdio: 'inherit', cwd: resolvePath(root, `${relativePath}`)}
  )
  log.info('Finished running yarn')
}

const yarnAddESLint = (relativePath: string) => {
  log.info(`Adding lint configs in ${relativePath}`)
  const lintDeps = join(' ', values(mapObjIndexed((version, name) => `${name}@${version}`, addToPackageJson)))
  execSync( `${yarnPath} add ${lintDeps} --dev`,
    {stdio: 'inherit', cwd: resolvePath(root, `${relativePath}`)}
  )
}

const getTypings = async (manifest: Manifest, account: string, workspace: string) => {
  const typingsData = await typingsInfo(account, workspace)

  const buildersWithInjectedDeps =
    pipe(
      prop('builders'),
      mapObjIndexed(
        (version: string, builder: string) => {
          const builderTypingsData = prop(builder, typingsData)
          if (builderTypingsData && has(version, builderTypingsData)) {
            return ramdaPath([version, 'injectedDependencies'], builderTypingsData)
          }
          return null
        }
      ),
      ramdaReject(isNil)
    )(manifest)

  const buildersWithAppDeps =
    pipe(
      mapObjIndexed(
        (injectedDependencies) => merge(manifest.dependencies, injectedDependencies)
      ),
      ramdaReject(isEmpty)
    )(buildersWithInjectedDeps as Record<string, any>)

  await pipe(
    mapObjIndexed(
      async (appDeps: Record<string, any>, builder: string) => {
        const packageJsonPath = resolvePackageJsonPath(builder)
        if (await pathExists(packageJsonPath)) {
          const packageJson = readJsonSync(packageJsonPath)
          const oldDevDeps = packageJson.devDependencies || {}
          const oldTypingsEntries = filter(test(typingsURLRegex), oldDevDeps)
          const newTypingsEntries = await appsWithTypingsURLs(builder, account, workspace, appDeps)
          if (!equals(oldTypingsEntries, newTypingsEntries)) {
            const cleanOldDevDeps = ramdaReject(test(typingsURLRegex), oldDevDeps)
            outputJsonSync(
              packageJsonPath,
              {
                ...packageJson,
                ...{ 'devDependencies': { ...cleanOldDevDeps, ...newTypingsEntries } },
              },
              { spaces: '\t' }
            )
            try {
              runYarn(builder)
            } catch (e) {
              log.error(`Error running Yarn in ${builder}.`)
              await outputJsonSync(packageJsonPath, packageJson, { spaces: '\t' })  // Revert package.json to original state.
            }

          }
        }
      }
    ),
    values,
    Promise.all
  )(buildersWithAppDeps as Record<string, any>)

}

const tsconfig = async (account: string, workspace: string) => {
  const http = builderHttp(account, workspace)
  const retryOpts = {
    retries: 2,
    minTimeout: 1000,
    factor: 2,
  }
  const downloadTSConfig = async (_: any, tryCount: number) => {
    if (tryCount > 1) {
      log.info(`Retrying...${tryCount-1}`)
    }
    try {
      const res = await http.get(`/_v/builder/0/tsconfig`)
      return res.data
    } catch (err) {
      const statusMessage = err.response.status ?
        `: Status ${err.response.status}` : ''
      log.error(`Error fetching tsconfig from builder-hub ${statusMessage} (try: ${tryCount})`)
      throw err
    }
  }
  try {
    return retry(downloadTSConfig, retryOpts)
  } catch (e) {
    log.error('Unable to get tsconfig.json info from vtex.builder-hub.')
    return {}
  }
}

export const getTSConfig = async (manifest: Manifest, account: string, workspace: string) => {
  const tsconfigsFromBuilder = await tsconfig(account, workspace)
  const buildersWithBaseTSConfig =
    compose(
      ramdaReject(isNil),
      mapObjIndexed(
        (version: string, builder: string) => { const builderTSConfig = prop(builder, tsconfigsFromBuilder)
          if (builderTSConfig && has(version, builderTSConfig)) {
            return prop(version, builderTSConfig)
          }
          return null
        }
      ),
      prop('builders')
    )(manifest)


  return mapObjIndexed(
    (baseTSConfig: any, builder: any) => {
      try {
      const tsconfigPath = resolveTSConfigPath(builder)
      const currentTSConfig = readJsonSync(tsconfigPath)
      const newTSConfig = mergeDeepRight(currentTSConfig, baseTSConfig)
      outputJsonSync(tsconfigPath, newTSConfig, { spaces: 2 })  // Revert package.json to original state.
      } catch(e) {
        log.error(e)
      }
    }
  )(buildersWithBaseTSConfig as Record<string, any>)
}

export const setupTSLint = async (manifest: Manifest) => {
  const builders = keys(prop('builders', manifest) || {})
  const filteredBuilders = intersection(builders, buildersToAddAdditionalPackages)
  const lintDeps = keys(addToPackageJson)
  compose<any, any, any>(
    Promise.all,
    map(
      async (builder: string) => {
        try {
          const packageJsonPath = resolvePackageJsonPath(builder)
          const devDependencies = (prop('devDependencies', await readJson(packageJsonPath))) || {}
          if (difference(lintDeps, intersection(lintDeps, keys(devDependencies))).length !== 0) {
            yarnAddESLint(builder)
            await outputJson(resolveTSLintPath(builder), addToEslintrc[builder], { spaces: 2 })
          }
        } catch(e) {
          log.error(e)
        }
      }
    )
  )(filteredBuilders)
}

export default async () => {
  const manifest = await getManifest()
  const context = { account: getAccount(), workspace: getWorkspace(), environment: getEnvironment() }
  await setupTSLint(manifest)
  await getTSConfig(manifest, context.account, context.workspace)
  await getTypings(manifest, context.account, context.workspace)
}
