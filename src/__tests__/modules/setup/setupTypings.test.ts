import { manifestSamples } from '../../fixtures/manifests'
import { mockAppsUtils, mockBuilderHubDatasource, mockConf, mockEnv, mockRunYarn, mockSetupUtils } from './mocks'

mockConf()
mockEnv()
mockRunYarn()
const { setAvailableAppIDs } = mockAppsUtils()
const { setBuilderHubTypings } = mockBuilderHubDatasource()
const { setPackageJsonByBuilder, packageJsonEditorMock } = mockSetupUtils()

const { runYarn } = jest.requireMock('../../../modules/utils')
const { setupTypings } = require('../../../modules/setup/setupTypings')

beforeEach(() => {
  jest.clearAllMocks()
  runYarn.mockReturnValue(undefined)
})

describe('React type dependencies are correctly inserted', () => {
  setBuilderHubTypings({
    react: { '3.x': { injectedDependencies: { 'vtex.render-runtime': '8.x' } } },
  })

  test('Generated package.json has BuilderHub injected typings, app deps typings and old dev deps', async () => {
    setAvailableAppIDs({
      'vtex.admin': { '1.x': 'vtex.admin@1.18.0' },
      'vtex.render-runtime': { '8.x': 'vtex.render-runtime@8.1.0' },
    })

    setPackageJsonByBuilder({
      react: { name: 'mock', devDependencies: { someApp: '^1.0.0' } },
    })

    await setupTypings(manifestSamples['node4-react3-app'])

    expect(packageJsonEditorMock.read).toBeCalledTimes(1)
    expect(packageJsonEditorMock.read).toBeCalledWith('react')
    expect(packageJsonEditorMock.write).toBeCalledTimes(1)
    expect(packageJsonEditorMock.write).toBeCalledWith('react', {
      name: 'mock',
      devDependencies: {
        someApp: '^1.0.0',
        'vtex.admin': 'http://vtex.vteximg.com.br/_v/public/typings/v1/vtex.admin@1.18.0/public/_types/react',
        'vtex.render-runtime':
          'http://vtex.vteximg.com.br/_v/public/typings/v1/vtex.render-runtime@8.1.0/public/_types/react',
      },
    })
    expect(runYarn).toBeCalledTimes(1)
  })

  test('If an app is linked the dependency url is different', async () => {
    setAvailableAppIDs({
      'vtex.admin': { '1.x': 'vtex.admin@1.18.0+build123' },
      'vtex.render-runtime': { '8.x': 'vtex.render-runtime@8.1.0' },
    })

    setPackageJsonByBuilder({
      react: { name: 'mock', devDependencies: { someApp: '^1.0.0' } },
    })

    await setupTypings(manifestSamples['node4-react3-app'])

    expect(packageJsonEditorMock.read).toBeCalledTimes(1)
    expect(packageJsonEditorMock.read).toBeCalledWith('react')
    expect(packageJsonEditorMock.write).toBeCalledTimes(1)
    expect(packageJsonEditorMock.write).toBeCalledWith('react', {
      name: 'mock',
      devDependencies: {
        someApp: '^1.0.0',
        'vtex.admin':
          'https://current-workspace--logged-account.public-endpoint/_v/private/typings/linked/v1/vtex.admin@1.18.0+build123/public/_types/react',
        'vtex.render-runtime':
          'http://vtex.vteximg.com.br/_v/public/typings/v1/vtex.render-runtime@8.1.0/public/_types/react',
      },
    })
    expect(runYarn).toBeCalledTimes(1)
  })
})

test('If yarn fails, package.json is reset to its initial state', async () => {
  runYarn.mockImplementation(() => {
    throw new Error('MOCK-ERR')
  })

  setAvailableAppIDs({
    'vtex.admin': { '1.x': 'vtex.admin@1.18.0' },
    'vtex.render-runtime': { '8.x': 'vtex.render-runtime@8.1.0' },
  })

  setPackageJsonByBuilder({
    react: { name: 'mock', devDependencies: { someApp: '^1.0.0' } },
  })

  await setupTypings(manifestSamples['node4-react3-app'])
  expect(packageJsonEditorMock.write).toBeCalledTimes(2)
  expect(packageJsonEditorMock.write).toHaveBeenLastCalledWith('react', {
    name: 'mock',
    devDependencies: { someApp: '^1.0.0' },
  })
})

test(`If package.json doesn't exist do nothing`, async () => {
  packageJsonEditorMock.read.mockImplementation(() => {
    const err: any = new Error('MOCK_ERR')
    err.code = 'ENOENT'
    throw err
  })

  await setupTypings(manifestSamples['node4-react3-app'])
  expect(packageJsonEditorMock.write).not.toBeCalled()
})
