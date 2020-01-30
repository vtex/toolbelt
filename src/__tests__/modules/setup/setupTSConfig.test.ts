import { manifestSamples } from '../../fixtures/manifests'
import { builderHubTsConfigMock } from './fixtures/builderHubTSConfig'
import { mockCreateClients, mockSetupUtils } from './mocks'

const { setBuilderHubTsConfig } = mockCreateClients()
const { setTSConfigByBuilder, tsconfigEditorMock, setPackageJsonByBuilder } = mockSetupUtils()

const { setupTSConfig } = require('../../../modules/setup/setupTSConfig')

const pkg = { devDependencies: {} }
setPackageJsonByBuilder({ root: pkg })

beforeEach(() => {
  jest.clearAllMocks()
})

describe('TSConfig result is correct', () => {
  const checkTSConfigOutput = ({ react: reactExpectedTSConfig, node: nodeExpectedTSConfig }: any) => {
    const getCall = (which: string) => tsconfigEditorMock.write.mock.calls.find(arr => arr[0] === which)
    const reactCallArgs = getCall('react')
    expect(reactCallArgs[1]).toEqual(reactExpectedTSConfig)
    const nodeCallArgs = getCall('node')
    expect(nodeCallArgs[1]).toEqual(nodeExpectedTSConfig)
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
