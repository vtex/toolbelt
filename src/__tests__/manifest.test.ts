import {
  namePattern,
  parseManifest,
  validateAppManifest,
  vendorPattern,
  versionPattern,
  wildVersionPattern,
} from '../manifest'

test.each([['foo@', false], ['foo_bar', true], ['foo-bar', true], ['foo', true]])(
  'validates a vendor name: %s should be %s',
  (vendorName: string, result: boolean) => {
    const vendorRegex = new RegExp(`^${vendorPattern}$`)
    expect(vendorRegex.test(vendorName)).toBe(result)
  }
)

test.each([['foo@', false], ['foo_bar', true], ['foo-bar', true], ['foo', true]])(
  'validates an app name: %s results %s',
  (appName: string, result: boolean) => {
    const nameRegex = new RegExp(`^${namePattern}$`)
    expect(nameRegex.test(appName)).toBe(result)
  }
)

test.each([['0.1', false], ['0.1.0_beta', false], ['0.1.0', true], ['0.1.0-beta', true]])(
  'validates an app version: %s results %s',
  (appVersion: string, result: boolean) => {
    const versionRegex = new RegExp(`^${versionPattern}$`)
    expect(versionRegex.test(appVersion)).toBe(result)
  }
)

test.each([['x.1.0', false], ['0.1.x_beta', false], ['0.x', true], ['0.1.x', true], ['0.1.x-beta', true]])(
  'validates an app version with a wildcard: %s results %s',
  (appVersion: string, result: boolean) => {
    const wildVersionRegex = new RegExp(`^${wildVersionPattern}$`)
    expect(wildVersionRegex.test(appVersion)).toBe(result)
  }
)

test.each([
  ['manifest', 'not throw', { name: 'foo-bar', version: '1.2.0', vendor: 'foo' }],
  ['namelessManifest', 'throw', { version: '1.2.0', vendor: 'foo' }],
  ['versionlessManifest', 'throw', { name: 'foo-bar', vendor: 'foo' }],
  ['badNameManifest', 'throw', { name: 'foo-bar@', version: '1.2.0', vendor: 'foo' }],
  ['badVersionManifest', 'throw', { name: 'foo-bar', version: '1.2.x', vendor: 'foo' }],
  ['badVendorManifest', 'throw', { name: 'foo-bar', version: '1.2.0', vendor: 'foo@bar' }],
])('validates an app manifest: %s should %s', (_: any, shouldThrow: string, manifest: any) => {
  if (shouldThrow === 'throw') {
    expect(() => validateAppManifest(manifest)).toThrow()
  } else {
    expect(() => validateAppManifest(manifest)).not.toThrow()
  }
})

test.each([
  ['manifest', 'not throw', '{"policies": [{"name": "full-access"}]}'],
  ['manifestMalformed', 'throw', '{"policies":test [{"name": "full-access"}]}'],
])('validates an app manifest format: %s should %s', (_: any, shouldThrow: string, manifest: string) => {
  if (shouldThrow === 'throw') {
    expect(() => parseManifest(manifest)).toThrow()
  } else {
    expect(() => parseManifest(manifest)).not.toThrow()
    expect(parseManifest(manifest)).toBeTruthy()
  }
})
