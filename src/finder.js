import {pipe, values, find as rfind, propEq, pick, chain, props, omit, type, equals, filter, map, flatten, reduce, reject, isNil} from 'ramda'
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

export function parseOptions ({options = {}}, argv) {
  return pick(chain(props(['long', 'short']), options), argv)
}

const omitOptions = omit(['options'])
const isObject = pipe(type, equals('Object'))
const otherObjects = pipe(omitOptions, values, filter(isObject))

export function findOptions (node) {
  if (!node) {
    return []
  }
  return flatten([map(findOptions, otherObjects(node)), node.options || []])
}

// TODO: A current limitation is that options are found recursively.
// This means that deeper options might accidentally overwrite shallower ones
// if the have the same name and different types. The solution would be to only
// consider options in the current level, but would make us re-parse argv with
// the option's types on every new level.
export function optionsByType (options) {
  return reduce((result, option) => {
    if (!option.type) {
      return result
    }
    result[option.type] = flatten(reject(isNil, [result[option.type], option.short, option.long]))
    return result
  }, {}, options)
}

export function find (node, args, argv) {
  // Accept root, argv as initial arguments
  if (node && args._ && argv == null) {
    return find(node, args._.slice(0), args)
  }

  const findByAlias = pipe(values, rfind(propEq('alias', args[0])))
  const command = node[args[0]] || findByAlias(node)

  // There are more arguments but no tree to traverse, or
  // there are no more arguments and no command was found.
  if (command == null || args.length === 0) {
    return {
      command: null,
      options: parseOptions(node, argv),
      requiredArgs: [],
      optionalArgs: [],
      argv,
    }
  }

  // Next node is a namespace, traverse down.
  if (!command.handler) {
    return find(command, args.slice(1), argv)
  }

  // Next node is a command with handler
  const commandArgs = args.slice(1)
  const requiredArgs = parseCommandArgs(command, commandArgs)
  const optionalArgs = parseCommandOpts(command, commandArgs)

  return {
    name: argv._.join(' ').split(args[0]).shift() + args[0],
    command,
    options: parseOptions(command, argv),
    requiredArgs,
    optionalArgs,
    argv,
  }
}

export function run ({command, requiredArgs, optionalArgs, argv}) {
  return command.handler.apply(this, requiredArgs.concat(optionalArgs, argv))
}
