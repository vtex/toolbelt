import { manifestSamples } from '../../fixtures/manifests'
import { builderHubTsConfigMock } from './fixtures/builderHubTSConfig'
import { mockBuilderHubDatasource, mockSetupUtils } from './mocks'

const { setBuilderHubTsConfig } = mockBuilderHubDatasource()
const { setTSConfigByBuilder, tsconfigEditorMock } = mockSetupUtils()

const { setupTSConfig } = require('../../../modules/setup/setupTSConfig')

beforeEach(() => {
  jest.clearAllMocks()
})

describe('TSConfig result is correct', () => {
  const checkTSConfigOutput = ({ react, node }: any) => {
    const getCall = (which: string) => tsconfigEditorMock.write.mock.calls.find(arr => arr[0] === which)
    const reactCallArgs = getCall('react')
    expect(reactCallArgs[1]).toEqual(react)
    const nodeCallArgs = getCall('node')
    expect(nodeCallArgs[1]).toEqual(node)
  }

  test(`If local tsconfig doesn't exist`, async () => {
    setBuilderHubTsConfig(builderHubTsConfigMock)
    tsconfigEditorMock.read.mockImplementation(() => {
      const e: any = new Error()
      e.code = 'ENOENT'
      throw e
    })

    await setupTSConfig(manifestSamples['node4-react3-app'])
    checkTSConfigOutput({ node: builderHubTsConfigMock.node['4.x'], react: builderHubTsConfigMock.react['3.x'] })
  })

  test(`If local tsconfig equals builder hub's one`, async () => {
    setBuilderHubTsConfig(builderHubTsConfigMock)
    setTSConfigByBuilder({ node: builderHubTsConfigMock.node['4.x'], react: builderHubTsConfigMock.react['3.x'] })
    await setupTSConfig(manifestSamples['node4-react3-app'])
    checkTSConfigOutput({ node: builderHubTsConfigMock.node['4.x'], react: builderHubTsConfigMock.react['3.x'] })
  })

  test(`If local tsconfig has some differences`, async () => {
    setBuilderHubTsConfig(builderHubTsConfigMock)
    setTSConfigByBuilder({
      node: { a: { b: 'bb' }, e: 'e' },
      react: { a: 'c', c: ['c', 'cc'], d: 'd' },
    })
    await setupTSConfig(manifestSamples['node4-react3-app'])
    checkTSConfigOutput({
      node: { a: { b: 'b', c: 'c' }, d: 'd', e: 'e' },
      react: { a: { b: 'b' }, c: 'c', d: 'd' },
    })
  })
})
