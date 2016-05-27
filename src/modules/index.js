import {mergeAll, values, keys} from 'ramda'
import * as apps from './apps'
import * as auth from './auth'
// import * as masterdata from './masterdata'
// import * as render from './render'
// import * as workspace from './workspace'

export function commandsByModule (modules = [
  auth,
  apps,
]) {
  return mergeAll(modules)
}

export function commandsByName (commands = commandsByModule()) {
  return keys(commands).reduce((result, k) => {
    result[commands[k].command.replace(/\s.*$/, '')] = commands[k]
    return result
  }, {})
}

export function commandsByAlias (commands = commandsByModule()) {
  return keys(commands).reduce((result, k) => {
    const alias = commands[k].alias
    if (alias != null) {
      result[alias.replace(/\s.*$/, '')] = commands[k]
    }
    return result
  }, {})
}

export function getCommandList (commands = commandsByName(commandsByModule())) {
  return values(commands)
}

export function getHandler (
  command,
  commands = commandsByName(commandsByModule()),
  aliases = commandsByAlias(commandsByModule()),
) {
  return commands[command] ? commands[command].handler : aliases[command].handler
}
