export const mockBuilderHubDatasource = () => {
  jest.doMock('../../../modules/setup/BuilderHubDatasource', () => {
    return {
      BuilderHubDatasource: {
        builderHubTsConfig: jest.fn(),
        typingsInfo: jest.fn(),
      },
    }
  })
  const { BuilderHubDatasource } = jest.requireMock('../../../modules/setup/BuilderHubDatasource')

  let builderHubTypings = {}
  BuilderHubDatasource.typingsInfo.mockImplementation(() => Promise.resolve(builderHubTypings))
  const setBuilderHubTypings = (newTypings: any) => (builderHubTypings = newTypings)

  let builderHubTsConfig = {}
  BuilderHubDatasource.builderHubTsConfig.mockImplementation(() => Promise.resolve(builderHubTsConfig))
  const setBuilderHubTsConfig = (newTSConfig: any) => (builderHubTsConfig = newTSConfig)

  return { setBuilderHubTypings, setBuilderHubTsConfig }
}

export const mockConf = () => {
  jest.doMock('../../../conf', () => {
    return {
      ...jest.requireActual('../../../conf'),
      getAccount: jest.fn().mockReturnValue('logged-account'),
      getWorkspace: jest.fn().mockReturnValue('current-workspace'),
      getToken: jest.fn().mockReturnValue('token'),
    }
  })
}

export const mockEnv = () => {
  jest.doMock('../../../env', () => {
    return {
      ...jest.requireActual('../../../env'),
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
  jest.doMock('../../../modules/apps/utils', () => {
    return {
      isLinked: jest.requireActual('../../../modules/apps/utils').isLinked,
      resolveAppId: jest.fn(),
    }
  })

  const { resolveAppId } = jest.requireMock('../../../modules/apps/utils')

  let appIDs = {}
  resolveAppId.mockImplementation((appName: string, appVersion: string) => appIDs[appName][appVersion])

  const setAvailableAppIDs = (newAppIDs: any) => (appIDs = newAppIDs)
  return { setAvailableAppIDs }
}

export const mockSetupUtils = () => {
  jest.doMock('../../../modules/setup/utils', () => {
    return {
      tsconfigEditor: { read: jest.fn(), write: jest.fn(), path: jest.fn() },
      packageJsonEditor: { read: jest.fn(), write: jest.fn(), path: jest.fn() },
      esLintrcEditor: { read: jest.fn(), write: jest.fn(), path: jest.fn() },
    }
  })

  const { tsconfigEditor, packageJsonEditor, esLintrcEditor } = jest.requireMock(
    '../../../modules/setup/utils'
  ) as Record<string, { read: jest.Mock; write: jest.Mock; path: jest.Mock }>

  const mockEditor = (editor: any, editorName: string) => {
    let dataByBuilder = {
      node: {},
      react: {},
    }

    editor.path.mockImplementation((builder: string) => `$path-${editorName}-${builder}`)

    const setDataByBuilder = (newData: any) => {
      editor.read.mockImplementation((builder: string) => dataByBuilder[builder])
      editor.write.mockImplementation((builder: string, newData: any) => (dataByBuilder[builder] = newData))
      dataByBuilder = newData
    }

    return { setDataByBuilder }
  }

  const { setDataByBuilder: setPackageJsonByBuilder } = mockEditor(packageJsonEditor, 'packageJson')
  const { setDataByBuilder: setTSConfigByBuilder } = mockEditor(tsconfigEditor, 'tsconfig')

  return {
    tsconfigEditorMock: tsconfigEditor,
    setTSConfigByBuilder,
    packageJsonEditorMock: packageJsonEditor,
    setPackageJsonByBuilder,
    esLintrcEditorMock: esLintrcEditor,
  }
}
