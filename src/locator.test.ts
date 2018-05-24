import test from 'ava'

import * as locator from './locator'

test('converts version to major range', t => {
  t.is(locator.toMajorRange('0.1.2'), '0.x')
  t.is(locator.toMajorRange('1.0.0'), '1.x')
  t.is(locator.toMajorRange('2.0'), '2.x')
})


test('creates major locator', t => {
  t.is(locator.toMajorLocator({ vendor: 'vtex', name: 'visa-checkout', version: '0.1.2' }), 'vtex.visa-checkout@0.x')
  t.is(locator.toMajorLocator({ vendor: 'xetv', name: 'render-builder', version: '1.20.12' }), 'xetv.render-builder@1.x')
  t.is(locator.toMajorLocator({ vendor: 'vext', name: 'toolbelt', version: '2.0.0' }), 'vext.toolbelt@2.x')
})

test('creates app locator', t => {
  t.is(locator.toAppLocator({ vendor: 'vtex', name: 'visa-checkout', version: '0.1.2' }), 'vtex.visa-checkout@0.1.2')
  t.is(locator.toAppLocator({ vendor: 'xetv', name: 'render-builder', version: '1.20.12' }), 'xetv.render-builder@1.20.12')
  t.is(locator.toAppLocator({ vendor: 'vext', name: 'toolbelt', version: '2.0.0' }), 'vext.toolbelt@2.0.0')
})

test('parses app locator', t => {
  t.deepEqual(locator.parseLocator('vtex.visa-checkout@0.1.2'), { vendor: 'vtex', name: 'visa-checkout', version: '0.1.2' })
  t.deepEqual(locator.parseLocator('xetv.render-builder@1.20.12'), { vendor: 'xetv', name: 'render-builder', version: '1.20.12' })
  t.deepEqual(locator.parseLocator('vext.toolbelt@2.0.0'), { vendor: 'vext', name: 'toolbelt', version: '2.0.0' })
})
