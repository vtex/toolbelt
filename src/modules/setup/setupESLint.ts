import { execSync } from 'child-process-es6-promise'
import { resolve as resolvePath } from 'path'
import * as R from 'ramda'
import log from '../../logger'
import { getAppRoot } from '../../manifest'
import { yarnPath } from '../utils'
import { esLintrcEditor, packageJsonEditor } from './utils'

const addToPackageJson = {
  eslint: '^5.15.1',
  'eslint-config-vtex': '^10.1.0',
  'eslint-config-vtex-react': '^4.1.0',
}

const addToEslintrc = {
  react: {
    extends: 'vtex-react',
    env: {
      browser: true,
      es6: true,
      jest: true,
    },
  },
  node: {
    extends: 'vtex',
    env: {
      node: true,
      es6: true,
      jest: true,
    },
  },
}

const yarnAddESLint = (relativePath: string) => {
  log.info(`Adding lint configs in ${relativePath}`)
  const lintDeps = R.join(' ', R.values(R.mapObjIndexed((version, name) => `${name}@${version}`, addToPackageJson)))
  execSync(`${yarnPath} add ${lintDeps} --dev`, {
    stdio: 'inherit',
    cwd: resolvePath(getAppRoot(), `${relativePath}`),
  })
}

const createESLintSetup = async (lintDeps: string[], builder: string) => {
  try {
    const devDependencies = R.prop('devDependencies', packageJsonEditor.read(builder)) || {}
    if (R.difference(lintDeps, R.intersection(lintDeps, R.keys(devDependencies))).length !== 0) {
      yarnAddESLint(builder)
    }
    esLintrcEditor.write(builder, addToEslintrc[builder])
  } catch (e) {
    log.error(e)
  }
}

export const setupESLint = async (manifest: Manifest, buildersToAddAdditionalPackages: string[]) => {
  const builders = R.keys(R.prop('builders', manifest) || {})
  const filteredBuilders = R.intersection(builders, buildersToAddAdditionalPackages)
  const lintDeps = R.keys(addToPackageJson)

  return Promise.all(R.map(R.curry(createESLintSetup)(lintDeps), filteredBuilders))
}
