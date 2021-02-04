import {
  isBillingApp,
  isForbiddenError,
  isNotFoundError,
  isMissingBillingOptions,
  hasErrorMessage,
  IS_MISSING_BILLING_OPTIONS,
} from '../../../modules/apps/install'

test('hasErrorMessage function', () => {
  expect(hasErrorMessage({})).toBeFalsy

  expect(hasErrorMessage({
    response: {
      data: {
        message: 'has message',
      }
    }
  })).toBeTruthy

  expect(hasErrorMessage({
    response: {
      data: {
        message: '',
      }
    }
  })).toBeFalsy

  expect(hasErrorMessage({
    response: {
      data: {
        message: null,
      }
    }
  })).toBeFalsy

  expect(hasErrorMessage({
    response: {
      data: {
        message: undefined,
      }
    }
  })).toBeFalsy
})

test('isForbiddenError and isNotFoundError', () => {
  expect(isForbiddenError({})).toBeFalsy
  expect(isForbiddenError({response: {status: 404}})).toBeFalsy
  expect(isForbiddenError({response: {status: 403}})).toBeTruthy

  expect(isNotFoundError({})).toBeFalsy
  expect(isNotFoundError({response: {status: 403}})).toBeFalsy
  expect(isNotFoundError({response: {status: 404}})).toBeTruthy
})

test('isMissingBillingOptions', () => {
  expect(isMissingBillingOptions(new Error(''))).toBeFalsy
  expect(isMissingBillingOptions(new Error(IS_MISSING_BILLING_OPTIONS))).toBeTruthy
})

test('isBillingApp function', () => {
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
