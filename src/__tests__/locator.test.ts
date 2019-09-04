import * as locator from '../locator'

test.each([['0.1.2', '0.x'], ['1.0.0', '1.x'], ['2.0', '2.x']])(
  'converts version to major range: %s ---> %s',
  (version: string, majorRange: string) => {
    expect(locator.toMajorRange(version)).toBe(majorRange)
  }
)

test.each([
  [{ vendor: 'vtex', name: 'visa-checkout', version: '0.1.2', builders: {} }, 'vtex.visa-checkout@0.x'],
  [{ vendor: 'xetv', name: 'render-builder', version: '1.20.12', builders: {} }, 'xetv.render-builder@1.x'],
  [{ vendor: 'vext', name: 'toolbelt', version: '2.0.0', builders: {} }, 'vext.toolbelt@2.x'],
])('creates major locator: %p ---> %s', (manifest: any, majorLocator: string) => {
  expect(locator.toMajorLocator(manifest)).toBe(majorLocator)
})

test.each([
  [{ vendor: 'vtex', name: 'visa-checkout', version: '0.1.2', builders: {} }, 'vtex.visa-checkout@0.1.2'],
  [{ vendor: 'xetv', name: 'render-builder', version: '1.20.12', builders: {} }, 'xetv.render-builder@1.20.12'],
  [{ vendor: 'vext', name: 'toolbelt', version: '2.0.0', builders: {} }, 'vext.toolbelt@2.0.0'],
])('creates app locator: %p ---> %s', (manifest: any, appLocator) => {
  expect(locator.toAppLocator(manifest)).toBe(appLocator)
})

test.each([
  ['vtex.visa-checkout@0.1.2', { vendor: 'vtex', name: 'visa-checkout', version: '0.1.2', builders: {} }],
  ['xetv.render-builder@1.20.12', { vendor: 'xetv', name: 'render-builder', version: '1.20.12', builders: {} }],
  ['vext.toolbelt@2.0.0', { vendor: 'vext', name: 'toolbelt', version: '2.0.0', builders: {} }],
])('parses app locator: %s ---> %p', (appLocator: string, parsed: any) => {
  expect(locator.parseLocator(appLocator)).toStrictEqual(parsed)
})
