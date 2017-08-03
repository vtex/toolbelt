import {path} from 'ramda'

import {apps} from '../../../clients'

const {getAppSettings} = apps

const FIELDS_START_INDEX = 2

export default (app: string, _, options) => {
  const fields = options._.slice(FIELDS_START_INDEX)
  return getAppSettings(app)
    .then(settings => fields === null ? settings : path(fields, settings))
    .then(value => JSON.stringify(value, null, 2))
    .tap(console.log)
}
