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
  const checkYarnCall = (builder: string) => {
    const yarnInstallation = `${yarnPath} add eslint@^5.15.1 eslint-config-vtex@^10.1.0 eslint-config-vtex-react@^4.1.0 --dev`
    expect(execSync).toBeCalledWith(yarnInstallation, {
      cwd: path.resolve('app-root', builder),
      stdio: 'inherit',
    })
  }

  const checkEsLintrc = (builder: string) => {
    expect(esLintrcEditorMock.write).toBeCalledWith(builder, expect.anything())
  }

  test('If package.json doesnt have any eslint deps', async () => {
    const pkg = { devDependencies: { '@types/node': '12.0.0' } }
    setPackageJsonByBuilder({ node: pkg, react: pkg })

    const builders = ['node', 'react']
    await setupESLint(manifestSamples['node4-react3-app'], builders)
    builders.forEach(builder => {
      checkYarnCall(builder)
      checkEsLintrc(builder)
    })
  })

  test('If package.json has some eslint deps', async () => {
    const pkg = { devDependencies: { eslint: '^5.15.1' } }
    setPackageJsonByBuilder({ node: pkg, react: pkg })

    const builders = ['node', 'react']
    await setupESLint(manifestSamples['node4-react3-app'], builders)
    builders.forEach(builder => {
      checkYarnCall(builder)
      checkEsLintrc(builder)
    })
  })

  test('If package.json has all eslint deps', async () => {
    const pkg = {
      devDependencies: {
        eslint: '^5.15.1',
        'eslint-config-vtex': '^10.1.0',
        'eslint-config-vtex-react': '^4.1.0',
      },
    }

    setPackageJsonByBuilder({ node: pkg, react: pkg })
    const builders = ['node', 'react']
    await setupESLint(manifestSamples['node4-react3-app'], builders)
    expect(execSync).not.toBeCalled()
    builders.forEach(builder => checkEsLintrc(builder))
  })
})
