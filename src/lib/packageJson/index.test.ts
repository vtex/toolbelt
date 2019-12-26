import { clone } from 'ramda'
import { PackageJson, PackageJsonInterface } from './index'

jest.mock('fs-extra', () => {
  return {
    pathExists: jest.fn(),
    readJson: jest.fn(),
    writeJson: jest.fn(),
    writeJsonSync: jest.fn(),
  }
})

const { readJson } = jest.requireMock('fs-extra') as Record<string, jest.Mock>

const setupPackageJson = async (content: any) => {
  const pkg = new PackageJson('mockPath')
  readJson.mockResolvedValue(clone(content))
  await pkg.init()
  return pkg
}

beforeEach(() => {
  readJson.mockClear()
})

describe('Version comparison', () => {
  const versionComparison = [
    [{ yarnResolved: '1.2.3', required: '1.2.3', found: '1.2.3', satisfies: true }],
    [{ yarnResolved: '1.2.3', required: '1.2.3', found: '1.2.3', satisfies: true }],
    [{ yarnResolved: '1.2.4', required: '1.2.3', found: '1.2.4', satisfies: false }],
    [{ yarnResolved: '1.2.3', required: '^1.0.0', found: '^1.0.0', satisfies: true }],
    [{ yarnResolved: '1.1.1', required: '^1.0.0', found: '1.1.1', satisfies: true }],
    [{ yarnResolved: '1.2.3', required: '^1.0.0', found: '^1.1.1', satisfies: true }],
    [{ yarnResolved: '1.1.2', required: '^1.0.0', found: '~1.1.1', satisfies: true }],
    [{ yarnResolved: '1.2.3', required: '^1.0.0', found: '1.x', satisfies: true }],
    [{ yarnResolved: '2.1.1', required: '^1.0.0', found: '2.1.1', satisfies: false }],
    [{ yarnResolved: '2.2.2', required: '^1.0.0', found: '^2.1.1', satisfies: false }],
    [{ yarnResolved: '2.1.2', required: '^1.0.0', found: '~2.1.1', satisfies: false }],
    [{ yarnResolved: '2.3.4', required: '^1.0.0', found: '2.x', satisfies: false }],
    [{ yarnResolved: '1.0.0', required: '^1.1.0', found: '1.x', satisfies: false }],
    [{ yarnResolved: '1.2.3', required: '^1.1.0', found: '1.x', satisfies: true }],
    [{ yarnResolved: '1.2.3', required: '^1.1.0', found: '~1.0.0', satisfies: true }],
    [{ yarnResolved: '1.0.1', required: '^1.1.0', found: '~1.0.0', satisfies: false }],
    [{ yarnResolved: '1.0.5', required: '^1.1.0', found: '^1.0.0', satisfies: false }],
    [{ yarnResolved: '1.2.3', required: '^1.1.0', found: '^1.0.0', satisfies: true }],
    [{ yarnResolved: undefined, required: '1.2.3', found: '1.2.3', satisfies: true }],
    [{ yarnResolved: undefined, required: '1.2.4', found: '1.2.3', satisfies: false }],
    [{ yarnResolved: undefined, required: '^1.1.0', found: '1.0.0', satisfies: false }],
    [{ yarnResolved: undefined, required: '^1.1.0', found: 'invalid', satisfies: false }],
  ]

  test.each(versionComparison)('%# versionSatisfies: %p', ({ required, found, yarnResolved, satisfies }) => {
    expect(PackageJson.versionSatisfiesWithYarnPriority(required, found, yarnResolved)).toBe(satisfies)
  })
})

describe('PackageJson manipulation', () => {
  const pkgMocks: Array<[PackageJsonInterface]> = [
    [{}],
    [{ name: 'somePackage' }],
    [{ dependencies: { axios: '1.2.3' } }],
    [{ dependencies: { axios: '1.2.2' } }],
    [{ devDependencies: { axios: '1.2.3' } }],
    [{ devDependencies: { axios: '1.2.2' } }],
    [{ dependencies: { axios: '1.2.3' }, devDependencies: { '@types/axios': '1.2.4' } }],
    [{ dependencies: { axios: '1.2.2' }, devDependencies: { '@types/axios': '1.2.4' } }],
    [{ name: 'somePackage', dependencies: { axios: '1.2.3' }, devDependencies: { '@types/axios': '1.2.4' } }],
    [{ name: 'somePackage', dependencies: { axios: '1.2.2' }, devDependencies: { '@types/axios': '1.2.4' } }],
    [{ name: 'somePackage', dependencies: {}, devDependencies: { '@types/axios': '1.2.4' } }],
    [{ name: 'somePackage', devDependencies: { '@types/axios': '1.2.4' } }],
  ]

  test('package.json opened is the specifiend in the constructor', async () => {
    const mockObj = { mock: '123' }
    const pkg = new PackageJson('mockPath')
    readJson.mockResolvedValue(mockObj)
    await pkg.init()
    expect(readJson).toBeCalledTimes(1)
    expect(readJson).toBeCalledWith('mockPath')
    expect(pkg.content).toEqual(mockObj)
  })

  describe.each(pkgMocks)('PackageJson editing features - Sample %#', (pkgMock: PackageJsonInterface) => {
    test(`Add someDep: 'http://pkg.com.br' dependency`, async () => {
      const pkg = await setupPackageJson(pkgMock)
      const dep = { someDep: 'http://pkg.com.br' }
      pkg.addDependency('someDep', dep.someDep, 'dependencies')
      expect(pkg.content).toEqual({ ...pkgMock, dependencies: { ...pkgMock.dependencies, ...dep } })
    })

    test(`Add someDep: 'http://pkg.com.br' devDependency`, async () => {
      const pkg = await setupPackageJson(pkgMock)
      const dep = { someDep: 'http://pkg.com.br' }
      pkg.addDependency('someDep', dep.someDep, 'devDependencies')
      expect(pkg.content).toEqual({ ...pkgMock, devDependencies: { ...pkgMock.devDependencies, ...dep } })
    })

    test('Force dependency version', async () => {
      const before = clone(pkgMock)
      const pkg = await setupPackageJson(pkgMock)
      pkg.maybeChangeDepVersionByDepType('axios', '1.2.3', 'dependencies')
      if (before?.dependencies?.axios) {
        expect(pkg.content.dependencies.axios).toEqual('1.2.3')
        delete before.dependencies.axios
        delete pkg.content.dependencies.axios
      }

      expect(pkg.content).toEqual(before)
    })

    test('Force devDependency version', async () => {
      const before = clone(pkgMock)
      const pkg = await setupPackageJson(pkgMock)
      pkg.maybeChangeDepVersionByDepType('axios', '1.2.3', 'devDependencies')
      if (before?.devDependencies?.axios) {
        expect(pkg.content.devDependencies.axios).toEqual('1.2.3')
        delete before.devDependencies.axios
        delete pkg.content.devDependencies.axios
      }

      expect(pkg.content).toEqual(before)
    })
  })
})
