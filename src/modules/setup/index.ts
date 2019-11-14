import chalk from 'chalk'
import log from '../../logger'
import { getAppRoot, getManifest } from '../../manifest'
import { IOAppTypesManager } from './IOAppTypesManager'
import { setupESLint } from './setupESLint'
import { setupTSConfig } from './setupTSConfig'
import { packageJsonEditor } from './utils'

interface CommandOptions {
  t?: boolean
  types?: boolean
  i?: boolean
  'ignore-linked'?: boolean
  o?: boolean
  'own-types'?: boolean
}

const buildersToAddAdditionalPackages = ['react', 'node']

const addPostInstallScriptToPackageJson = (folder: string, script: string) => {
  log.debug(`Add postinstall script to ${chalk.bold(folder)} package.json`)
  let packageJson: any
  try {
    packageJson = packageJsonEditor.read(folder)
  } catch (err) {
    if (err.code === 'ENOENT') {
      packageJson = {}
    } else {
      throw err
    }
  }

  if (packageJson.scripts && packageJson.scripts.postinstall === script) {
    return
  }

  packageJson.scripts = {
    ...packageJson.scripts,
    postinstall: script,
  }

  packageJsonEditor.write(folder, packageJson)
}

export default async (opts: CommandOptions) => {
  const ignoreLinked = opts.i || opts['ignore-linked']
  const onlyTypes = opts.t || opts.types
  const onlyOwnTypes = opts.o || opts['own-types']

  const manifest = await getManifest()
  const root = getAppRoot()

  if (!onlyTypes) {
    setupESLint(manifest, buildersToAddAdditionalPackages)
    await setupTSConfig(manifest)
  }

  const typesManager = new IOAppTypesManager(root, manifest, { ignoreLinked })
  if (onlyOwnTypes) {
    await typesManager.installThisAppTypes()
  } else {
    await typesManager.setupTypes()
    IOAppTypesManager.buildersToAddTypes(manifest).forEach(builder =>
      addPostInstallScriptToPackageJson(builder, 'vtex setup --types --own-types')
    )
  }
}
