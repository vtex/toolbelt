import { getDistTag, getSimpleVersion } from '../modules/utils';

test.each([
  ['2.115.0-beta', 'beta'],
  ['2.115.0-beta.randomhash', 'beta'],
  ['2.115.1-internal.ced170aa', 'internal'],
  ['2.115.1', 'latest'],
])('validates a version tag: %s should be %s', (version: string, result: string) => {
  expect(getDistTag(version)).toBe(result)
})

test.each([
  ['2.115.0-beta', '2.115.0-beta'],
  ['2.115.0-beta.randomhash', '2.115.0-beta'],
  ['2.115.1-internal.ced170aa', '2.115.1-internal'],
  ['2.115.1', '2.115.1'],
])('validates a version simplifier: %s should be %s', (version: string, result: string) => {
  expect(getSimpleVersion(version)).toBe(result)
})