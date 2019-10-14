import * as path from 'path'
import { yarnPath } from '../../../modules/utils'
import { manifestSamples } from '../../fixtures/manifests'
import { mockSetupUtils } from './mocks'

const { setPackageJsonByBuilder, esLintrcEditorMock } = mockSetupUtils()
jest.mock('child-process-es6-promise', () => {
  return {
    execSync: jest.fn(),
  }
})

// execSync changes the cwd to getAppRoot(), so this is mocked to check this
jest.mock('../../../manifest', () => {
  return {
    getAppRoot: jest.fn().mockReturnValue('app-root'),
  }
})

const { execSync } = jest.requireMock('child-process-es6-promise')
const { setupESLint } = require('../../../modules/setup/setupESLint')

beforeEach(() => {
  jest.clearAllMocks()
})

describe('Yarn is called correctly and .eslintrc is created', () => {
  const checkYarnCall = () => {
    const dependencies = [
      'eslint@^6.4.0',
      'eslint-config-vtex@^11.0.0',
      'eslint-config-vtex-react@^5.0.1',
      '@types/node@^12.7.12',
      'prettier@^1.18.2',
      'typescript@^3.5.3',
    ]

    const yarnInstallation = `${yarnPath} add ${dependencies.join(' ')} --dev`
    expect(execSync).toBeCalledWith(yarnInstallation, {
      cwd: path.resolve('app-root'),
      stdio: 'inherit',
    })
  }

  const checkEsLintrc = () => {
    expect(esLintrcEditorMock.write).toBeCalledWith('.', expect.anything())
  }

  test(`If package.json doesn't have any eslint deps`, async () => {
    const pkg = { devDependencies: { '@types/node': '12.0.0' } }
    setPackageJsonByBuilder({ root: pkg })

    const builders = ['node', 'react']
    await setupESLint(manifestSamples['node4-react3-app'], builders)

    checkYarnCall()
    checkEsLintrc()
  })

  test('If package.json has some eslint deps', async () => {
    const pkg = { devDependencies: { eslint: '^5.15.1' } }
    setPackageJsonByBuilder({ root: pkg })

    const builders = ['node']
    await setupESLint(manifestSamples['node4-app'], builders)

    checkYarnCall()
    checkEsLintrc()
  })

  test('If package.json has all eslint deps', async () => {
    const pkg = {
      devDependencies: {
        eslint: '^6.4.0',
        'eslint-config-vtex': '^11.0.0',
        'eslint-config-vtex-react': '^5.0.1',
        '@types/node': '^12.7.12',
        prettier: '^1.18.2',
        typescript: '^3.5.3',
      },
    }

    setPackageJsonByBuilder({ root: pkg })
    const builders = ['node', 'react']
    await setupESLint(manifestSamples['node4-react3-app'], builders)
    expect(execSync).not.toBeCalled()
    checkEsLintrc()
  })

  it('should add custom config for react builder', async () => {
    const builders = ['react']

    await setupESLint(manifestSamples['react3-app'], builders)
    expect(esLintrcEditorMock.write).toHaveBeenCalledWith(
      'react',
      expect.objectContaining({
        extends: 'vtex-react',
      })
    )
  })
})
