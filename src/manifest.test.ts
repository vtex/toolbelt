import test from 'ava'

import {
  namePattern,
  vendorPattern,
  versionPattern,
  wildVersionPattern,
  validateAppManifest,
  parseManifest
} from './manifest'

test('validates a vendor name', t => {
  const vendorRegex = new RegExp(`^${vendorPattern}$`)
  t.false(vendorRegex.test('foo@'))
  t.true(vendorRegex.test('foo_bar'))
  t.true(vendorRegex.test('foo-bar'))
  t.true(vendorRegex.test('foo'))
})

test('validates an app name', t => {
  const nameRegex = new RegExp(`^${namePattern}$`)
  t.false(nameRegex.test('foo@'))
  t.true(nameRegex.test('foo_bar'))
  t.true(nameRegex.test('foo-bar'))
  t.true(nameRegex.test('foo'))
})

test('validates an app version', t => {
  const versionRegex = new RegExp(`^${versionPattern}$`)
  t.false(versionRegex.test('0.1'))
  t.false(versionRegex.test('0.1.0_beta'))
  t.true(versionRegex.test('0.1.0'))
  t.true(versionRegex.test('0.1.0-beta'))
})

test('validates an app version with a wildcard', t => {
  const wildVersionRegex = new RegExp(`^${wildVersionPattern}$`)
  t.false(wildVersionRegex.test('x.1.0'))
  t.false(wildVersionRegex.test('0.1.x_beta'))
  t.true(wildVersionRegex.test('0.x'))
  t.true(wildVersionRegex.test('0.1.x'))
  t.true(wildVersionRegex.test('0.1.x-beta'))
})

test('validates an app manifest', t => {
  const manifest = {
    name: 'foo-bar',
    version: '1.2.0',
    vendor: 'foo'
  }
  const namelessManifest = {
    version: '1.2.0',
    vendor: 'foo'
  }
  const versionlessManifest = {
    name: 'foo-bar',
    vendor: 'foo'
  }
  const vendorlessManifest = {
    name: 'foo-bar',
    version: '1.2.0'
  }
  const badNameManifest = {
    name: 'foo-bar@',
    version: '1.2.0',
    vendor: 'foo'
  }
  const badVersionManifest = {
    name: 'foo-bar',
    version: '1.2.x',
    vendor: 'foo'
  }
  const badVendorManifest = {
    name: 'foo-bar',
    version: '1.2.0',
    vendor: 'foo@bar'
  }
  t.notThrows(() => validateAppManifest(manifest))
  t.throws(() => validateAppManifest(namelessManifest))
  t.throws(() => validateAppManifest(versionlessManifest))
  t.throws(() => validateAppManifest(vendorlessManifest))
  t.throws(() => validateAppManifest(badNameManifest))
  t.throws(() => validateAppManifest(badVersionManifest))
  t.throws(() => validateAppManifest(badVendorManifest))
})

test('validates an app manifest format', t => {
  const manifest = '{"policies": [{"name": "full-access"}]}'
  const manifestMalformed = '{"policies":test [{"name": "full-access"}]}'
  t.truthy(parseManifest(manifest))
  t.throws(() => parseManifest(manifestMalformed))
})
