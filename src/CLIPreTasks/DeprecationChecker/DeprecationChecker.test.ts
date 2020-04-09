import { DeprecationChecker } from './DeprecationChecker'
import { IDeprecationCheckerStore, VersionDeprecationInfo } from './DeprecationCheckerStore'

class DeprecationCheckerStoreMock implements IDeprecationCheckerStore {
  public storeFilePath = 'mockFilePath'
  private versionDeprecationInfo: VersionDeprecationInfo
  private lastDeprecationCheck: number

  getLastDeprecationCheck() {
    return this.lastDeprecationCheck
  }

  getVersionDeprecationInfo() {
    return this.versionDeprecationInfo
  }

  setLastDeprecationCheck(date: number) {
    this.lastDeprecationCheck = date
  }

  setVersionDeprecationInfo(versionDeprecationInfo: VersionDeprecationInfo) {
    this.versionDeprecationInfo = versionDeprecationInfo
  }
}

describe('shouldCheckNpm works as expected', () => {
  it('Returns true when pkg version changes', () => {
    const store = new DeprecationCheckerStoreMock()
    store.setVersionDeprecationInfo({ versionChecked: '2.90.1', deprecated: true })
    const checker = new DeprecationChecker(store, { version: '2.90.0' })
    expect(checker.shouldCheckNpm()).toBe(true)
  })
})

describe('isDeprecated works as expected', () => {
  it.each([
    [false, { versionChecked: '2.90.0', deprecated: false }, '2.90.0'],
    [false, { versionChecked: '2.90.1', deprecated: false }, '2.90.0'],
    [false, { versionChecked: '2.90.1', deprecated: true }, '2.90.0'],
    [true, { versionChecked: '2.90.0', deprecated: true }, '2.90.0'],
  ])(
    'Returns %s when deprecationInfo is %p and current version is %s',
    (result: boolean, deprecationInfo: VersionDeprecationInfo, curVersion: string) => {
      const store = new DeprecationCheckerStoreMock()
      store.setVersionDeprecationInfo(deprecationInfo)
      const checker = new DeprecationChecker(store, { version: curVersion })
      expect(checker.isDeprecated()).toBe(result)
    }
  )
})
