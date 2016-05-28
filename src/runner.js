import {pipe, values, find as rfind, propEq} from 'ramda'
import ExtendableError from 'es6-error'

export class CommandNotFoundError extends ExtendableError {}
export class MissingRequiredArgsError extends ExtendableError {}

const toArray = a => Array.isArray(a) ? a : [a]

export function parseCommandArgs (command, args) {
  if (command.requires == null) {
    return []
  }
  const requiredArguments = toArray(command.requires)
  const difference = requiredArguments.length - args.length
  if (difference > 0) {
    throw new MissingRequiredArgsError(requiredArguments.slice(difference - 1).join(', '))
  }
  return args.slice(0, requiredArguments.length)
}

export function parseCommandOpts (command, args) {
  if (command.requires == null) {
    return args
  }
  const requiredArguments = toArray(command.requires)
  return args.slice(requiredArguments.length)
}

export function find (node, args, argv) {
  // Accept root, argv as initial arguments
  if (node && args._ && argv == null) {
    return find(node, args._.slice(0), args)
  }

  // There are no more arguments and no command was found.
  if (args.length === 0) {
    throw new CommandNotFoundError()
  }

  const findByAlias = pipe(values, rfind(propEq('alias', args[0])))
  const command = node[args[0]] || findByAlias(node)

  // There are more arguments but no tree to traverse.
  if (command == null) {
    throw new CommandNotFoundError(args[0])
  }

  // Next node is a namespace, traverse down.
  if (!command.handler) {
    return find(command, args.slice(1), argv)
  }

  // Next node is a command with handler
  const commandArgs = args.slice(1)
  const requires = parseCommandArgs(command, commandArgs)
  const options = parseCommandOpts(command, commandArgs)

  return {
    name: argv._.join(' ').split(args[0]).shift() + args[0],
    command,
    requires,
    options,
  }
}

export function run ({command, requires, options}) {
  return command.handler.apply(this, requires.concat(options))
}
