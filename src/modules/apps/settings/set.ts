import {last, assocPath, merge, __} from 'ramda'

import {apps} from '../../../clients'

const {getAppSettings, saveAppSettings} = apps

const FIELDS_START_INDEX = 3

const castValue = value => {
  let parsedValue
  try {
    parsedValue = JSON.parse(value)
  } catch (err) {
    parsedValue = value
  }
  const numberCast = Number(value)
  return isNaN(numberCast) ? parsedValue : numberCast
}

export default {
  description: 'Set a value',
  requiredArgs: ['app', 'fields', 'value'],
  handler: (app: string, _field, _value, options) => {
    const value = last(options._)
    const fields = options._.slice(FIELDS_START_INDEX, options._.length - 1)
    const realValue = castValue(value)
    const commandSettings = assocPath(fields, realValue, {})
    return getAppSettings(app)
      .then(merge(__, commandSettings))
      .then(newSettings => JSON.stringify(newSettings, null, 2))
      .tap(newSettings => saveAppSettings(app, newSettings))
      .tap(console.log)
  },
}
