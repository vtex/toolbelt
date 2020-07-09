import chalk from 'chalk'
import { execSync } from 'child_process'
import { resolve } from 'path'
import { mergeDeepRight } from 'ramda'
import { ErrorKinds } from '../../api/error/ErrorKinds'
import { ErrorReport } from '../../api/error/ErrorReport'
import { default as log, default as logger } from '../../api/logger'
import { getAppRoot } from '../../api/manifest/ManifestUtil'
import { yarnPath } from '../utils'
import {
  BUILDERS_WITH_TOOLING,
  CONTENT_BASE_ESLINT_RC,
  CONTENT_ESLINT_IGNORE,
  CONTENT_ESLINT_RC_BUILDERS,
  CONTENT_PRETTIER_RC,
  DEPENDENCIES,
} from './consts'
import {
  eslintIgnoreEditor,
  eslintrcEditor,
  getRootPackageJson,
  hasDevDependenciesInstalled,
  packageJsonEditor,
  prettierrcEditor,
} from './utils'

/**
 * Returns a base package.json configuration
 * @param {string} appName
 * @returns
 */
function getBasePackageJson(appName: string) {
  return {
    name: appName,
    private: true,
    license: 'UNLICENSED',
    scripts: {
      lint: 'eslint --ext js,jsx,ts,tsx .',
      format: 'prettier --write "**/*.{ts,tsx,js,jsx,json}"',
    },
    husky: {
      hooks: {
        'pre-commit': 'lint-staged',
      },
    },
    'lint-staged': {
      '*.{ts,js,tsx,jsx}': ['eslint --fix', 'prettier --write'],
      '*.{json,graphql,gql}': ['prettier --write'],
    },
    devDependencies: {},
  }
}

/**
 * Installs a map of dependencies at the project's root
 * @param {Record<string, string>} deps
 */
function installDeps(deps: Record<string, string>) {
  const depList = Object.entries(deps)
    .map(([app, version]) => `${app}@${version}`)
    .join(' ')

  execSync(`${yarnPath} add -D ${depList}`, {
    // only errors (stderr) are useful here, ignore stdin and stdout
    stdio: ['ignore', 'ignore', 'inherit'],
    cwd: resolve(getAppRoot()),
  })
}

/**
 * Configures the root package.json with the base configuration
 * @param {Manifest} manifest
 */
function configurePackageJson(manifest: Manifest) {
  const rootPkgJson = getRootPackageJson()
  if (rootPkgJson == null) {
    log.warn(`No "package.json" found in "${resolve(getAppRoot())}". Creating one.`)
  }
  const newPkgJson = mergeDeepRight(getBasePackageJson(manifest.name), rootPkgJson || {})

  packageJsonEditor.write('.', newPkgJson)
}

/**
 * Installs and configures root dependencies common for all projects.
 */
function setupCommonTools() {
  const rootPkgJson = getRootPackageJson()
  const hasCommonDeps = hasDevDependenciesInstalled({
    deps: DEPENDENCIES.common,
    pkg: rootPkgJson,
  })

  if (!hasCommonDeps) {
    const depList = Object.keys(DEPENDENCIES.common)
      .map(name => chalk.blue(name))
      .join(', ')
    log.info(`Adding common dependencies to root: ${depList}`)

    installDeps(DEPENDENCIES.common)
  }

  log.info(`Configuring ${chalk.blue('.eslintrc')}`)
  eslintrcEditor.write('.', CONTENT_BASE_ESLINT_RC)

  log.info(`Configuring ${chalk.blue('.eslintignore')}`)
  eslintIgnoreEditor.write('.', CONTENT_ESLINT_IGNORE.trim())

  log.info(`Configuring ${chalk.blue('.prettierrc')}`)
  prettierrcEditor.write('.', CONTENT_PRETTIER_RC.trim())
}

/**
 * Installs and sets up root dependencies related to each builder.
 * @param {Manifest} manifest
 */
function setupBuilderTools(builders: string[]) {
  const rootPkgJson = getRootPackageJson()

  for (const builder of builders) {
    const builderDeps = DEPENDENCIES[builder]

    if (builderDeps != null) {
      const hasDepsInstalled = hasDevDependenciesInstalled({
        deps: DEPENDENCIES[builder],
        pkg: rootPkgJson,
      })

      if (hasDepsInstalled) continue

      const depList = Object.keys(DEPENDENCIES[builder])
        .map(name => chalk.blue(name))
        .join(', ')
      log.info(`Adding "${chalk.yellow(builder)}" builder dependencies to root: ${depList}`)

      installDeps(DEPENDENCIES[builder])
    }

    const eslintConfig = CONTENT_ESLINT_RC_BUILDERS[builder]
    if (eslintConfig != null) {
      log.info(`Configuring ${chalk.blue(`${builder}/.eslintrc`)}`)
      eslintrcEditor.write(builder, eslintConfig)
    }
  }
}

export function setupTooling(manifest: Manifest, buildersWithTooling = BUILDERS_WITH_TOOLING) {
  logger.info(`Setting up tooling`)
  const builders = Object.keys(manifest.builders || {})
  const needTooling = builders.some(b => buildersWithTooling.includes(b))

  if (!needTooling) {
    logger.warn(`This project doesn't have builders candidates for tooling`)
    return
  }

  try {
    configurePackageJson(manifest)
    setupCommonTools()
    setupBuilderTools(builders)
    logger.info('Finished setting up tooling')
  } catch (err) {
    ErrorReport.createAndMaybeRegisterOnTelemetry({
      kind: ErrorKinds.SETUP_TOOLING_ERROR,
      originalError: err,
    }).logErrorForUser()
  }
}
