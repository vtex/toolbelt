import { ManifestValidator } from '../api/manifest'

test.each([
  ['foo@', false],
  ['foo_bar', true],
  ['foo-bar', true],
  ['foo', true],
])('validates a vendor name: %s should be %s', (vendorName: string, result: boolean) => {
  const vendorRegex = new RegExp(`^${ManifestValidator.vendorPattern}$`)
  expect(vendorRegex.test(vendorName)).toBe(result)
})

test.each([
  ['foo@', false],
  ['foo_bar', true],
  ['foo-bar', true],
  ['foo', true],
])('validates an app name: %s results %s', (appName: string, result: boolean) => {
  const nameRegex = new RegExp(`^${ManifestValidator.namePattern}$`)
  expect(nameRegex.test(appName)).toBe(result)
})

test.each([
  ['0.1', false],
  ['0.1.0_beta', false],
  ['0.1.0', true],
  ['0.1.0-beta', true],
])('validates an app version: %s results %s', (appVersion: string, result: boolean) => {
  const versionRegex = new RegExp(`^${ManifestValidator.versionPattern}$`)
  expect(versionRegex.test(appVersion)).toBe(result)
})

test.each([
  ['x.1.0', false],
  ['0.1.x_beta', false],
  ['0.x', true],
  ['0.1.x', true],
  ['0.1.x-beta', true],
])('validates an app version with a wildcard: %s results %s', (appVersion: string, result: boolean) => {
  const wildVersionRegex = new RegExp(`^${ManifestValidator.wildVersionPattern}$`)
  expect(wildVersionRegex.test(appVersion)).toBe(result)
})

test.each([
  ['manifest', 'not throw', { name: 'foo-bar', version: '1.2.0', vendor: 'foo' }],
  ['namelessManifest', 'throw', { version: '1.2.0', vendor: 'foo' }],
  ['versionlessManifest', 'throw', { name: 'foo-bar', vendor: 'foo' }],
  ['badNameManifest', 'throw', { name: 'foo-bar@', version: '1.2.0', vendor: 'foo' }],
  ['badVersionManifest', 'throw', { name: 'foo-bar', version: '1.2.x', vendor: 'foo' }],
  ['badVendorManifest', 'throw', { name: 'foo-bar', version: '1.2.0', vendor: 'foo@bar' }],
])('validates an app manifest: %s should %s', (_: any, shouldThrow: string, manifest: any) => {
  if (shouldThrow === 'throw') {
    expect(() => ManifestValidator.validate(manifest)).toThrow()
  } else {
    expect(() => ManifestValidator.validate(manifest)).not.toThrow()
  }
})
