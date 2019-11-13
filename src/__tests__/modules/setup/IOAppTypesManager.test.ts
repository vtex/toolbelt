import { mockAppsUtils, mockConf, mockEnv, mockRunYarn, mockSetupUtils } from './mocks'

mockConf()
mockEnv()
const { runYarn } = mockRunYarn()
const { setAppsAvailableAppIDs, setRegistryAvailableAppIDs } = mockAppsUtils()
const { setPackageJsonByBuilder, packageJsonEditorMock, setTarGzEmptyResponse } = mockSetupUtils()

const { IOAppTypesManager } = jest.requireActual('../../../modules/setup/IOAppTypesManager')

beforeEach(() => {
  jest.clearAllMocks()
})

describe('getAppTypesInfo', () => {
  describe('New types format are enabled', () => {
    beforeEach(() => {
      setTarGzEmptyResponse(false)
    })

    it('Returns a vtexassets URL if the app is not linked', async () => {
      setAppsAvailableAppIDs({ 'vtex.render-runtime': { '8.x': 'vtex.render-runtime@8.1.0' } })
      const typeInfo = await IOAppTypesManager.getAppTypesInfo('vtex.render-runtime', '8.x', false)
      expect(typeInfo).toEqual({
        appName: 'vtex.render-runtime',
        majorLocator: '8.x',
        version: '8.1.0',
        isLinkedUrl: false,
        url: `http://vtex.vtexassets.com/_v/public/typings/v1/vtex.render-runtime@8.1.0/public/@types/vtex.render-runtime`,
      })
    })

    it('Returns a linked app URL if the app is linked', async () => {
      setAppsAvailableAppIDs({ 'vtex.render-runtime': { '8.x': 'vtex.render-runtime@8.1.0+build123' } })
      const typeInfo = await IOAppTypesManager.getAppTypesInfo('vtex.render-runtime', '8.x', false)
      expect(typeInfo).toEqual({
        appName: 'vtex.render-runtime',
        majorLocator: '8.x',
        version: '8.1.0+build123',
        isLinkedUrl: true,
        url: `https://current-workspace--logged-account.public-endpoint/_v/private/typings/linked/v1/vtex.render-runtime@8.1.0+build123/public/@types/vtex.render-runtime`,
      })
    })

    it('Returns a vtexassets URL if the app is linked and ignoreLinked is true', async () => {
      setAppsAvailableAppIDs({ 'vtex.render-runtime': { '8.x': 'vtex.render-runtime@8.1.0+build123' } })
      setRegistryAvailableAppIDs({ 'vtex.render-runtime': { '8.x': 'vtex.render-runtime@8.1.1' } })
      const typeInfo = await IOAppTypesManager.getAppTypesInfo('vtex.render-runtime', '8.x', true)
      expect(typeInfo).toEqual({
        appName: 'vtex.render-runtime',
        majorLocator: '8.x',
        version: '8.1.1',
        isLinkedUrl: false,
        url: `http://vtex.vtexassets.com/_v/public/typings/v1/vtex.render-runtime@8.1.1/public/@types/vtex.render-runtime`,
      })
    })
  })

  describe('New types format are disabled', () => {
    beforeEach(() => {
      setTarGzEmptyResponse(true)
    })

    it('Returns a vtexassets URL if the app is not linked', async () => {
      setAppsAvailableAppIDs({ 'vtex.render-runtime': { '8.x': 'vtex.render-runtime@8.1.0' } })
      const typeInfo = await IOAppTypesManager.getAppTypesInfo('vtex.render-runtime', '8.x', false)
      expect(typeInfo).toEqual({
        appName: 'vtex.render-runtime',
        majorLocator: '8.x',
        version: '8.1.0',
        isLinkedUrl: false,
        url: `http://vtex.vtexassets.com/_v/public/typings/v1/vtex.render-runtime@8.1.0/public/_types/react`,
      })
    })

    it('Returns a linked app URL if the app is linked', async () => {
      setAppsAvailableAppIDs({ 'vtex.render-runtime': { '8.x': 'vtex.render-runtime@8.1.0+build123' } })
      const typeInfo = await IOAppTypesManager.getAppTypesInfo('vtex.render-runtime', '8.x', false)
      expect(typeInfo).toEqual({
        appName: 'vtex.render-runtime',
        majorLocator: '8.x',
        version: '8.1.0+build123',
        isLinkedUrl: true,
        url: `https://current-workspace--logged-account.public-endpoint/_v/private/typings/linked/v1/vtex.render-runtime@8.1.0+build123/public/_types/react`,
      })
    })

    it('Returns a vtexassets URL if the app is linked and ignoreLinked is true', async () => {
      setAppsAvailableAppIDs({ 'vtex.render-runtime': { '8.x': 'vtex.render-runtime@8.1.0+build123' } })
      setRegistryAvailableAppIDs({ 'vtex.render-runtime': { '8.x': 'vtex.render-runtime@8.1.1' } })
      const typeInfo = await IOAppTypesManager.getAppTypesInfo('vtex.render-runtime', '8.x', true)
      expect(typeInfo).toEqual({
        appName: 'vtex.render-runtime',
        majorLocator: '8.x',
        version: '8.1.1',
        isLinkedUrl: false,
        url: `http://vtex.vtexassets.com/_v/public/typings/v1/vtex.render-runtime@8.1.1/public/_types/react`,
      })
    })
  })
})

describe('addTypesUrlsToPackageJson', () => {
  beforeEach(() => {
    runYarn.mockReturnValue(undefined)
  })

  it('Inserts all types urls to devDependencies on package.json', async () => {
    setPackageJsonByBuilder({
      react: { name: 'mock', devDependencies: { someApp: '^1.0.0' } },
    })

    await IOAppTypesManager.addTypesUrlsToPackageJson(
      [
        {
          appName: 'vtex.render-runtime',
          majorLocator: '8.x',
          version: '8.1.0',
          isLinkedUrl: false,
          url: `http://vtex.vtexassets.com/_v/public/typings/v1/vtex.render-runtime@8.1.0/public/@types/vtex.render-runtime`,
        },
      ],
      'react'
    )

    expect(packageJsonEditorMock.read).toBeCalledTimes(1)
    expect(packageJsonEditorMock.read).toBeCalledWith('react')
    expect(packageJsonEditorMock.write).toBeCalledTimes(1)
    expect(packageJsonEditorMock.write).toBeCalledWith('react', {
      name: 'mock',
      devDependencies: {
        someApp: '^1.0.0',
        'vtex.render-runtime':
          'http://vtex.vtexassets.com/_v/public/typings/v1/vtex.render-runtime@8.1.0/public/@types/vtex.render-runtime',
      },
    })

    expect(runYarn).toBeCalledTimes(1)
  })

  it('Resets the package.json if runYarn throws', async () => {
    runYarn.mockImplementation(() => {
      throw new Error('MOCK-ERR')
    })

    setPackageJsonByBuilder({
      react: { name: 'mock', devDependencies: { someApp: '^1.0.0' } },
    })

    await IOAppTypesManager.addTypesUrlsToPackageJson(
      [
        {
          appName: 'vtex.render-runtime',
          majorLocator: '8.x',
          version: '8.1.0',
          isLinkedUrl: false,
          url: `http://vtex.vtexassets.com/_v/public/typings/v1/vtex.render-runtime@8.1.0/public/@types/vtex.render-runtime`,
        },
      ],
      'react'
    )

    expect(packageJsonEditorMock.write).toBeCalledTimes(2)
    expect(packageJsonEditorMock.write).toHaveBeenLastCalledWith('react', {
      name: 'mock',
      devDependencies: { someApp: '^1.0.0' },
    })
  })

  it(`Create the package.json if it doesn't exist`, async () => {
    packageJsonEditorMock.read.mockImplementation(() => {
      const err: any = new Error('MOCK_ERR')
      err.code = 'ENOENT'
      throw err
    })

    await IOAppTypesManager.addTypesUrlsToPackageJson(
      [
        {
          appName: 'vtex.render-runtime',
          majorLocator: '8.x',
          version: '8.1.0',
          isLinkedUrl: false,
          url: `http://vtex.vtexassets.com/_v/public/typings/v1/vtex.render-runtime@8.1.0/public/@types/vtex.render-runtime`,
        },
      ],
      'react'
    )

    expect(packageJsonEditorMock.read).toBeCalledTimes(1)
    expect(packageJsonEditorMock.read).toBeCalledWith('react')
    expect(packageJsonEditorMock.write).toBeCalledTimes(1)
    expect(packageJsonEditorMock.write).toBeCalledWith('react', {
      devDependencies: {
        'vtex.render-runtime':
          'http://vtex.vtexassets.com/_v/public/typings/v1/vtex.render-runtime@8.1.0/public/@types/vtex.render-runtime',
      },
    })

    expect(runYarn).toBeCalledTimes(1)
  })
})
