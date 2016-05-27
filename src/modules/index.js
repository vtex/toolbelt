import {mergeAll, values, keys} from 'ramda'
import * as apps from './apps'
import * as auth from './auth'
import * as workspace from './workspace'
// import * as masterdata from './masterdata'
// import * as render from './render'

const argsRegex = /\s<.*$/

export function commandsByModule (modules = [
  auth,
  apps,
  workspace,
]) {
  return mergeAll(modules)
}

export function commandsByName (commands = commandsByModule()) {
  return keys(commands).reduce((result, k) => {
    result[commands[k].command.replace(argsRegex, '')] = commands[k]
    return result
  }, {})
}

export function commandsByAlias (commands = commandsByModule()) {
  return keys(commands).reduce((result, k) => {
    const alias = commands[k].alias
    if (alias != null) {
      result[alias.replace(argsRegex, '')] = commands[k]
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

export function getCommandName (args) {
  if (args.length > 2) {
    return args.slice(0, 2).join(' ')
  }

  return args[0]
}
