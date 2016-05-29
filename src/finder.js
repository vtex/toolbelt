import {type, values, find as rfind, propEq, pick, chain, props, flatten, reduce, reject, isNil, filter} from 'ramda'
import ExtendableError from 'es6-error'

export class MissingRequiredArgsError extends ExtendableError {}

export const toArray = a => Array.isArray(a) ? a : (a == null ? [] : [a])

export function parseCommandArgs (command, args) {
  if (!command || command.requiredArgs == null) {
    return []
  }
  const requiredArguments = toArray(command.requiredArgs)
  const difference = requiredArguments.length - args.length
  if (difference > 0) {
    throw new MissingRequiredArgsError(requiredArguments.slice(difference - 1).join(', '))
  }
  return args.slice(0, requiredArguments.length)
}

export function parseCommandOpts (command, args) {
  if (!command || command.optionalArgs == null) {
    return []
  }
  const requiredArguments = toArray(command.requiredArgs)
  const definedOptions = toArray(command.optionalArgs)
  return args.slice(requiredArguments.length, requiredArguments.length + definedOptions.length)
}

export function parseOptions (options, argv) {
  return pick(chain(props(['long', 'short']), options), argv)
}

export function findOptions (node) {
  return node.options || []
}

export function optionsByType (options) {
  return reduce((result, option) => {
    if (!option.type) {
      return result
    }
    result[option.type] = flatten(reject(isNil, [result[option.type], option.short, option.long]))
    return result
  }, {}, options)
}

export function isCommand (node) {
  return node && type(node.handler) === 'Function'
}

export function isNamespace (node) {
  return !isCommand(node) && type(node) === 'Object'
}

export function isOptions (node) {
  return Array.isArray(node)
}

export function filterCommands (node) {
  return filter(isCommand, node)
}

export function filterNamespaces (node) {
  return filter(isNamespace, node)
}

export function filterOptions (node) {
  return filter(isOptions, node)
}

export function findByAlias (key, node) {
  return rfind(propEq('alias', key), values(node))
}

export function findNext (key, node) {
  return key ? node[key] || findByAlias(key, node) : null
}

export function find (node, args, raw, minimist) {
  // Accept (node, raw, minimist) as initial arguments
  if (arguments.length === 3) {
    const argv = raw(args, optionsByType(findOptions(node)))
    return find(node, argv._.slice(0), args, raw)
  }

  const next = findNext(args[0], node)

  if (isNamespace(next)) {
    return find(next, args.slice(1), raw, minimist)
  }

  const commandArgs = args.slice(1)
  const options = findOptions(isCommand(next) ? next : node)
  const argv = minimist(raw, optionsByType(options))

  return {
    command: next,
    node: node,
    options: parseOptions(options, argv),
    requiredArgs: parseCommandArgs(next, commandArgs),
    optionalArgs: parseCommandOpts(next, commandArgs),
    argv,
  }
}

export function run ({command, requiredArgs, optionalArgs, argv}) {
  return command.handler.apply(this, requiredArgs.concat(optionalArgs, argv))
}
