import { isBillingApp } from '../../../modules/apps/install'

test('isBillingApp function', async () => {
  const tests = {
    'vtex.billing': true,
    'vtex.billing@': true,
    'vtex.billing@1.0.0': true,
    'vtex.billing@1.0.0-beta': true,
    'vtex.billing@1.0.0-beta.0': true,
    'vtex.billing-other': false,
    'vtex.billings': false,
    'vtex.billings@1.0.0': false,
    'vendor.billing@1.0.0': false,
    'vendor.billing': false,
  }
  Object.keys(tests).forEach(app => {
    expect(isBillingApp(app)).toEqual(tests[app])
  })
})
