import { __, merge, zipObj } from 'ramda'
import { apps } from '../../../clients'
import { parseArgs } from '../utils'

const castValue = value => {
  let parsedValue
  try {
    parsedValue = JSON.parse(value)
  } catch (err) {
    parsedValue = value
  }
  const numberCast = Number(value)
  return Number.isNaN(numberCast) ? parsedValue : numberCast
}

const transformCommandsToObj = commandSettings => {
  const k = []
  const v = []
  for (const [idx, val] of commandSettings.entries()) {
    const realValue = castValue(val)
    if (idx % 2) {
      v.push(realValue)
    } else {
      k.push(realValue)
    }
  }
  return zipObj(k, v)
}

export default async (app: string, _, ___, options) => {
  const commandSettings = transformCommandsToObj(parseArgs(options._))
  const newSettingsJson = await apps
    .getAppSettings(app)
    .then(merge(__, commandSettings))
    .then(newSettings => JSON.stringify(newSettings, null, 2))

  await apps.saveAppSettings(app, newSettingsJson)
  console.log(newSettingsJson)
}
