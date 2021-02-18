export const mockCreateClients = () => {
  const builder = {
    builderHubTsConfig: jest.fn(),
    typingsInfo: jest.fn(),
  }

  jest.doMock('../../../api/clients/IOClients/apps/Builder', () => {
    return {
      Builder: {
        createClient: () => builder,
      },
    }
  })

  let builderHubTypings = {}
  builder.typingsInfo.mockImplementation(() => Promise.resolve(builderHubTypings))
  const setBuilderHubTypings = (newTypings: any) => (builderHubTypings = newTypings)

  let builderHubTsConfig = {}
  builder.builderHubTsConfig.mockImplementation(() => Promise.resolve(builderHubTsConfig))
  const setBuilderHubTsConfig = (newTSConfig: any) => (builderHubTsConfig = newTSConfig)

  return { setBuilderHubTypings, setBuilderHubTsConfig }
}

export const mockConf = () => {
  jest.doMock('../../../api/conf', () => {
    return {
      ...jest.requireActual('../../../api/conf'),
      getAccount: jest.fn().mockReturnValue('logged-account'),
      getWorkspace: jest.fn().mockReturnValue('current-workspace'),
      getToken: jest.fn().mockReturnValue('token'),
    }
  })
}

export const mockEnv = () => {
  jest.doMock('../../../api/env', () => {
    return {
      ...jest.requireActual('../../../api/env'),
      publicEndpoint: jest.fn().mockReturnValue('public-endpoint'),
    }
  })
}

export const mockRunYarn = () => {
  jest.mock('../../../modules/utils', () => {
    return {
      runYarn: jest.fn().mockReturnValue(undefined),
    }
  })
}

export const mockAppsUtils = () => {
  jest.doMock('../../../api/modules/utils', () => {
    return {
      isLinked: jest.requireActual('../../../api/modules/utils').isLinked,
      resolveAppId: jest.fn(),
      appIdFromRegistry: jest.fn(),
    }
  })

  const { resolveAppId, appIdFromRegistry } = jest.requireMock('../../../api/modules/utils')
  let appsAppIDs = {}
  resolveAppId.mockImplementation((appName: string, appVersion: string) => appsAppIDs[appName][appVersion])
  let registryAppIDs = {}
  appIdFromRegistry.mockImplementation((appName: string, appVersion: string) => registryAppIDs[appName][appVersion])

  const setAppsAvailableAppIDs = (newAppIDs: any) => (appsAppIDs = newAppIDs)
  const setRegistryAvailableAppIDs = (newAppIDs: any) => (registryAppIDs = newAppIDs)
  return { setAppsAvailableAppIDs, setRegistryAvailableAppIDs, resolveAppId, appIdFromRegistry }
}

export const mockSetupUtils = () => {
  jest.doMock('../../../modules/setup/utils', () => {
    return {
      ...jest.requireActual('../../../modules/setup/utils'),
      checkIfTarGzIsEmpty: jest.fn(),
      tsconfigEditor: { read: jest.fn(), write: jest.fn(), path: jest.fn() },
      packageJsonEditor: { read: jest.fn(), write: jest.fn(), path: jest.fn() },
      esLintrcEditor: { read: jest.fn(), write: jest.fn(), path: jest.fn() },
      eslintIgnoreEditor: { read: jest.fn(), write: jest.fn(), path: jest.fn() },
      prettierrcEditor: { read: jest.fn(), write: jest.fn(), path: jest.fn() },
    }
  })

  const {
    tsconfigEditor,
    packageJsonEditor,
    esLintrcEditor,
    eslintIgnoreEditor,
    prettierrcEditor,
    checkIfTarGzIsEmpty,
  } = jest.requireMock('../../../modules/setup/utils') as Record<
    string,
    { read: jest.Mock; write: jest.Mock; path: jest.Mock }
  > & { checkIfTarGzIsEmpty: jest.Mock }

  const mockEditor = (editor: any, editorName: string) => {
    let dataByBuilder = {
      root: {},
      node: {},
      react: {},
    }

    editor.path.mockImplementation((builder: string) => `$path-${editorName}-${builder}`)

    const setDataByBuilder = (newData: any) => {
      editor.read.mockImplementation((builder: string) => {
        if (builder === '.') {
          return dataByBuilder['root']
        }

        return dataByBuilder[builder]
      })
      editor.write.mockImplementation((builder: string, newData: any) => {
        if (builder === '.') {
          dataByBuilder['root'] = newData
        } else {
          dataByBuilder[builder] = newData
        }

        return newData
      })
      dataByBuilder = newData
    }

    return { setDataByBuilder }
  }

  const { setDataByBuilder: setPackageJsonByBuilder } = mockEditor(packageJsonEditor, 'packageJson')
  const { setDataByBuilder: setTSConfigByBuilder } = mockEditor(tsconfigEditor, 'tsconfig')

  const setTarGzEmptyResponse = (res: boolean) => checkIfTarGzIsEmpty.mockResolvedValue(res)

  return {
    tsconfigEditorMock: tsconfigEditor,
    setTSConfigByBuilder,
    packageJsonEditorMock: packageJsonEditor,
    setPackageJsonByBuilder,
    esLintrcEditorMock: esLintrcEditor,
    eslintIgnoreEditorMock: eslintIgnoreEditor,
    prettierrcEditorMock: prettierrcEditor,
    checkIfTarGzIsEmpty,
    setTarGzEmptyResponse,
  }
}
