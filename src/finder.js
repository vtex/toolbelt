import {pipe, values, find as rfind, propEq, pick, chain, props, flatten, reduce, reject, isNil} from 'ramda'
import ExtendableError from 'es6-error'

export class MissingRequiredArgsError extends ExtendableError {}

const toArray = a => Array.isArray(a) ? a : (a == null ? [] : [a])

export function parseCommandArgs (command, args) {
  if (command.requiredArgs == null) {
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
  if (command.optionalArgs == null) {
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

export function find (node, args, raw, minimist) {
  // Accept (node, raw, minimist) as initial arguments
  if (arguments.length === 3) {
    const argv = raw(args, optionsByType(findOptions(node)))
    return find(node, argv._.slice(0), args, raw)
  }

  const findByAlias = pipe(values, rfind(propEq('alias', args[0])))
  const command = node[args[0]] || findByAlias(node)

  // There are more arguments but no tree to traverse, or
  // there are no more arguments and no command was found.
  if (command == null || args.length === 0) {
    const argv = minimist(raw, optionsByType(findOptions(node)))
    return {
      command: null,
      node: node,
      options: parseOptions(findOptions(node), argv),
      requiredArgs: [],
      optionalArgs: [],
      argv,
    }
  }

  // Next node is a namespace, traverse down.
  if (!command.handler) {
    return find(command, args.slice(1), raw, minimist)
  }

  // Next node is a command with handler
  const commandArgs = args.slice(1)
  const requiredArgs = parseCommandArgs(command, commandArgs)
  const optionalArgs = parseCommandOpts(command, commandArgs)
  const argv = minimist(raw, optionsByType(findOptions(command)))

  return {
    name: argv._.join(' ').split(args[0]).shift() + args[0],
    command,
    node: command,
    options: parseOptions(findOptions(command), argv),
    requiredArgs,
    optionalArgs,
    argv,
  }
}

export function run ({command, requiredArgs, optionalArgs, argv}) {
  return command.handler.apply(this, requiredArgs.concat(optionalArgs, argv))
}
