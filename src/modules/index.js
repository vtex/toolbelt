import {mergeAll, prop, map, compose} from 'ramda'
import * as apps from './apps'
import * as auth from './auth'
import * as workspace from './workspace'
import * as options from './options'
// import * as masterdata from './masterdata'
// import * as render from './render'

export const commandTree = compose(mergeAll, map(prop('default')))

export const modules = [
  auth,
  apps,
  workspace,
  options,
]
