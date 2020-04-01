import { OutdatedChecker } from './OutdatedChecker'
import { IOutdatedCheckerStore, OutdatedInfo } from './OutdatedCheckerStore'

class OutdatedCheckerStoreMock implements IOutdatedCheckerStore {
  public storeFilePath = 'mockFilePath'
  private outdatedInfo: OutdatedInfo
  private lastOutdatedCheck: number

  getLastOutdatedCheck() {
    return this.lastOutdatedCheck
  }

  getOutdatedInfo() {
    return this.outdatedInfo
  }

  setLastOutdatedCheck(date: number) {
    this.lastOutdatedCheck = date
  }

  setOutdatedInfo(outdatedInfo: OutdatedInfo) {
    this.outdatedInfo = outdatedInfo
  }
}

describe('shouldCheckOutdated works as expected', () => {
  it('Returns true when pkg version changes', () => {
    const store = new OutdatedCheckerStoreMock()
    store.setOutdatedInfo({ versionChecked: '2.90.1', outdated: true })
    const checker = new OutdatedChecker(store, { version: '2.90.0' })
    expect(checker.shouldCheckOutdated()).toBe(true)
  })

  it('Returns true when is outdated', () => {
    const store = new OutdatedCheckerStoreMock()
    store.setOutdatedInfo({ versionChecked: '2.90.0', outdated: true })
    const checker = new OutdatedChecker(store, { version: '2.90.0' })
    expect(checker.shouldCheckOutdated()).toBe(true)
  })
})

describe('isOutdated works as expected', () => {
  it.each([
    [false, { versionChecked: '2.90.0', outdated: false }, '2.90.0'],
    [false, { versionChecked: '2.90.1', outdated: false }, '2.90.0'],
    [false, { versionChecked: '2.90.1', outdated: true }, '2.90.0'],
    [true, { versionChecked: '2.90.0', outdated: true }, '2.90.0'],
  ])(
    'Returns %s when deprecationInfo is %p and current version is %s',
    (result: boolean, outdatedInfo: OutdatedInfo, curVersion: string) => {
      const store = new OutdatedCheckerStoreMock()
      store.setOutdatedInfo(outdatedInfo)
      const checker = new OutdatedChecker(store, { version: curVersion })
      expect(checker.isOutdated()).toBe(result)
    }
  )
})
