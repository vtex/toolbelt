import logger from './logger'
import { getAppRoot } from './manifest/ManifestUtil'
import { PackageJson } from '../lib/packageJson'

export interface PinnedDeps {
  common: {
    [depName: string]: string
  }
  builders: {
    [builder: string]: {
      [majorLocator: string]: {
        [depName: string]: string
      }
    }
  }
}

export const fixBuilderFolderPinnedDeps = async (
  appRoot: string,
  builder: string,
  builderPinnedDeps: Record<string, string>
) => {
  const pkgJson = await PackageJson.getBuilderPackageJsonIfExists(appRoot, builder, true, logger)
  if (!pkgJson) {
    return
  }

  const depNames = Object.keys(builderPinnedDeps)
  depNames.forEach(depName => {
    const depVersion = builderPinnedDeps[depName]
    pkgJson.changeDepVersionIfUnsatisfied(depName, depVersion)
  })

  await pkgJson.flushChanges()
}

export const fixPinnedDependencies = async (
  pinnedDeps: PinnedDeps,
  buildersToFixDeps: string[],
  manifestBuilders: Record<string, string>
) => {
  const appRoot = getAppRoot()
  await Promise.all(
    buildersToFixDeps.map((builder: string) => {
      const builderMajorLocator = manifestBuilders[builder]
      if (!builderMajorLocator) {
        return Promise.resolve()
      }

      const pinnedDepsForBuilder = {
        ...pinnedDeps.builders[builder]?.[builderMajorLocator],
        ...pinnedDeps.common,
      }

      return fixBuilderFolderPinnedDeps(appRoot, builder, pinnedDepsForBuilder)
    })
  )
}
