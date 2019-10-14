import { execSync } from 'child-process-es6-promise'
import { resolve as resolvePath } from 'path'
import * as R from 'ramda'
import log from '../../logger'
import { getAppRoot } from '../../manifest'
import { yarnPath } from '../utils'
import { esLintrcEditor, packageJsonEditor, eslintIgnoreEditor, prettierrcEditor } from './utils'

const basePackageJson = (appName: string) => ({
  name: appName,
  private: true,
  license: 'UNLICENSED',
  scripts: {
    lint: 'eslint --ext js,jsx,ts,tsx .',
  },
})

const eslintIgnore = `
node_modules
`.trim()

const basePrettierRc = {
  semi: false,
  singleQuote: true,
  trailingComma: 'es5',
  eslintIntegration: true,
}

const lintDeps = {
  eslint: '^6.4.0',
  'eslint-config-vtex': '^11.0.0',
  'eslint-config-vtex-react': '^5.0.1',
  '@types/node': '^12.7.12',
  prettier: '^1.18.2',
  typescript: '^3.5.3',
}

const baseEslintrc = {
  extends: 'vtex',
  root: true,
  env: {
    node: true,
    es6: true,
    jest: true,
  },
}

// eslint-disable-next-line
// @ts-ignore
const customEslintrc = {
  react: {
    extends: 'vtex-react',
    env: {
      browser: true,
      es6: true,
      jest: true,
    },
  },
}

const yarnAddESLint = () => {
  log.info('Adding lint configs in app root')
  const lintPackages = R.join(' ', R.values(R.mapObjIndexed((version, name) => `${name}@${version}`, lintDeps)))
  execSync(`${yarnPath} add ${lintPackages} --dev`, {
    stdio: 'inherit',
    cwd: resolvePath(getAppRoot()),
  })
}

const createESLintSetup = (appName: string, lintPackages: string[]) => {
  try {
    const originalRootPackageJson = packageJsonEditor.read('.')

    packageJsonEditor.write('.', R.mergeDeepRight(originalRootPackageJson, basePackageJson(appName)))
    eslintIgnoreEditor.write('.', eslintIgnore)
    prettierrcEditor.write('.', basePrettierRc)

    const devDependencies = R.prop('devDependencies', originalRootPackageJson) || {}

    if (R.difference(lintPackages, R.intersection(lintPackages, R.keys(devDependencies))).length !== 0) {
      yarnAddESLint()
    }

    log.info('Configuring app .eslintrc.json')
    esLintrcEditor.write('.', baseEslintrc)
  } catch (e) {
    log.error(e)
  }
}

const setupCustomEsLintForBuilder = (builder: string) => {
  const customConfig = customEslintrc[builder]

  try {
    log.info(`Setting up ${builder}'s ESLint config`)
    esLintrcEditor.write(builder, customConfig)
  } catch (err) {
    log.error(err)
  }
}

export const setupESLint = (manifest: Manifest, buildersToAddAdditionalPackages: string[]) => {
  const builders = R.keys(R.prop('builders', manifest) || {})
  const filteredBuilders = R.intersection(builders, buildersToAddAdditionalPackages)

  const lintPackages = R.keys(lintDeps)

  if (filteredBuilders.length > 0) {
    createESLintSetup(manifest.name, lintPackages)
  }

  const buildersWithCustomLint = R.keys(customEslintrc)

  buildersWithCustomLint.forEach(builder => {
    setupCustomEsLintForBuilder(builder)
  })
}
