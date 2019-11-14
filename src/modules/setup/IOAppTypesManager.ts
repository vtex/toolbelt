import axios from 'axios'
import chalk from 'chalk'
import { ensureDirSync, existsSync, removeSync } from 'fs-extra'
import { join } from 'path'
import * as R from 'ramda'
import { pipeline } from 'stream'
import * as tar from 'tar'
import * as util from 'util'
import { createClients } from '../../clients'
import { getAccount, getWorkspace } from '../../conf'
import { publicEndpoint } from '../../env'
import { parseLocator, toMajorRange } from '../../locator'
import log from '../../logger'
import { appIdFromRegistry, isLinked, resolveAppId } from '../apps/utils'
import { runYarn } from '../utils'
import { checkIfTarGzIsEmpty, packageJsonEditor } from './utils'

type MajorLocator = string
interface AppTypesInfo {
  appName: string
  majorLocator: MajorLocator
  version: string
  isLinkedUrl: boolean
  url: string
}

interface BuilderHubInjectedDepsResponse {
  [builder: string]: {
    [builderMajorLocator: string]: {
      injectedDependencies: {
        [appName: string]: MajorLocator
      }
    }
  }
}

const typingsURLRegex = /_v\/\w*\/typings/

export class IOAppTypesManager {
  public static buildersToAddTypes(manifest: Manifest) {
    return R.intersection(['node', 'react'], Object.keys(manifest.builders || {}))
  }

  private static async getAppTypesInfo(
    appName: string,
    appMajorLocator: MajorLocator,
    ignoreLinked: boolean
  ): Promise<AppTypesInfo> {
    const appId = ignoreLinked
      ? await appIdFromRegistry(appName, appMajorLocator)
      : await resolveAppId(appName, appMajorLocator)

    const locator = parseLocator(appId)
    const linked = isLinked(locator)

    const oldSuffix = `/_types/react`
    const newSuffix = `/@types/${appName}`

    const isLinkedUrl = linked && !ignoreLinked
    const base = isLinkedUrl
      ? `https://${getWorkspace()}--${getAccount()}.${publicEndpoint()}/_v/private/typings/linked/v1/${appId}/public`
      : `http://vtex.vtexassets.com/_v/public/typings/v1/${appId}/public`

    log.info(`Checking if ${chalk.bold(appId)} has new types format`)
    try {
      const newTypesExist = !(await checkIfTarGzIsEmpty(base + newSuffix))
      return {
        appName,
        isLinkedUrl: linked && !ignoreLinked,
        version: locator.version,
        majorLocator: appMajorLocator,
        url: base + (newTypesExist ? newSuffix : oldSuffix),
      }
    } catch (err) {
      log.error(`Error checking if types package is empty for ${base + newSuffix}`)
      throw err
    }
  }

  private static async getTypesInfos(
    apps: { [appName: string]: MajorLocator },
    ignoreLinked: boolean
  ): Promise<AppTypesInfo[]> {
    const typesInfos: (null | AppTypesInfo)[] = await Promise.all(
      Object.keys(apps).map(appName => {
        const appMajorLocator = apps[appName]
        return IOAppTypesManager.getAppTypesInfo(appName, appMajorLocator, ignoreLinked).catch(err => {
          if (err && err.response) {
            log.debug(err.response.data)
          }

          log.error(`Unable to generate typings URL for ${appName}@${appMajorLocator}.`)
          return null
        })
      })
    )

    return typesInfos.filter(typeInfo => typeInfo != null)
  }

  private static async downloadAppTypes(appTypesInfo: AppTypesInfo, nodeModulesPath: string) {
    const extractPath = join(nodeModulesPath, `${appTypesInfo.appName}`)
    if (existsSync(extractPath)) {
      removeSync(extractPath)
    }

    const res = await axios.get(appTypesInfo.url, {
      headers: {
        'User-Agent': 'vtex.toolbelt',
      },
      responseType: 'stream',
      timeout: 10000,
    })

    ensureDirSync(extractPath)
    return await util.promisify(pipeline)([res.data, tar.extract({ cwd: extractPath })])
  }

  private static async addTypesUrlsToPackageJson(typesInfos: AppTypesInfo[], builder: string) {
    let packageJson: any = {}
    try {
      packageJson = packageJsonEditor.read(builder)
    } catch (e) {
      if (e.code === 'ENOENT') {
        log.warn(`No package.json found in ${packageJsonEditor.path(builder)}. Creating one...`)
      } else {
        log.error(e)
        return
      }
    }

    log.info(`Injecting typings on ${builder}'s package.json`)
    const oldDevDeps = packageJson.devDependencies || {}
    const oldTypingsEntries = R.filter(R.test(typingsURLRegex), oldDevDeps)
    const newTypingsEntries = typesInfos.reduce(
      (prev, typesInfo) => ({ ...prev, [typesInfo.appName]: typesInfo.url }),
      {}
    )

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

  private buildersWithTypes: string[]
  constructor(private projectRoot: string, private manifest: Manifest, private opts: any) {
    this.buildersWithTypes = IOAppTypesManager.buildersToAddTypes(this.manifest)
  }

  public async setupTypes() {
    await this.installOtherAppsTypes()
    await this.installThisAppTypes()
  }

  public async installThisAppTypes() {
    log.debug('Installing own types')
    const appName = this.manifest.vendor + '.' + this.manifest.name
    const appMajor = toMajorRange(this.manifest.version)
    const typesInfos = await IOAppTypesManager.getTypesInfos({ [appName]: appMajor }, this.opts.ignoreLinked)
    if (typesInfos.length === 0) {
      return
    }

    const ownTypesInfo = typesInfos[0]
    await Promise.all(
      this.buildersWithTypes.map(builder => {
        return IOAppTypesManager.downloadAppTypes(ownTypesInfo, join(this.projectRoot, builder, 'node_modules'))
      })
    )
  }

  public async installOtherAppsTypes() {
    log.debug('Installing types from manifest dependencies')
    const deps = this.manifest.dependencies || {}
    const { builder: builderClient } = createClients({}, { retries: 2, timeout: 5000 })

    log.info('Fetching names of dependencies injected by Builder Hub')
    const builderHubInjectedDeps: BuilderHubInjectedDepsResponse = await builderClient.typingsInfo()
    const manifestDepsTypesInfo = await IOAppTypesManager.getTypesInfos(deps, this.opts.ignoreLinked)

    await Promise.all(
      this.buildersWithTypes.map(async builder => {
        const builderInjectedDeps =
          R.path([builder, this.manifest.builders[builder], 'injectedDependencies'], builderHubInjectedDeps) || {}
        const injectedDepsTypesInfo = await IOAppTypesManager.getTypesInfos(builderInjectedDeps, this.opts.ignoreLinked)
        await IOAppTypesManager.addTypesUrlsToPackageJson([...manifestDepsTypesInfo, ...injectedDepsTypesInfo], builder)
      })
    )
  }
}
