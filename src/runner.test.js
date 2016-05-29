import test from 'ava'
import minimist from 'minimist'
import {find, run, CommandNotFoundError, MissingRequiredArgsError} from './runner'

const tree = {
  'login': {
    'requiredArgs': 'store',
    'optionalArgs': 'email',
    handler: () => {},
  },
  'logout': {
    handler: () => {},
  },
  'list': {
    'alias': 'ls',
    'optionalArgs': 'query',
    handler: () => {},
  },
  'install': {
    'requiredArgs': 'app',
    'alias': 'i',
    handler: () => {},
  },
  'uninstall': {
    'requiredArgs': 'app',
    handler: () => {},
  },
  'publish': {
    'requiredArgs': 'app',
    handler: () => {},
  },
  'workspace': {
    'new': {
      'requiredArgs': 'name',
      handler: () => {},
    },
    'delete': {
      'requiredArgs': 'name',
      handler: () => {},
    },
    'promote': {
      'requiredArgs': 'name',
      handler: () => {},
    },
    'list': {
      handler: () => {},
    },
  },
}

const cases = [
  {
    argv: minimist(['list']),
    command: tree.list,
    requiredArgs: [],
    optionalArgs: [],
    arguments: [],
  },
  {
    argv: minimist(['workspace', 'list']),
    command: tree.workspace.list,
    requiredArgs: [],
    optionalArgs: [],
    arguments: [],
  },
  {
    argv: minimist(['install', 'cool-app']),
    command: tree.install,
    requiredArgs: ['cool-app'],
    optionalArgs: [],
    arguments: ['cool-app'],
  },
  {
    argv: minimist(['i', 'cool-app']),
    command: tree.install,
    requiredArgs: ['cool-app'],
    optionalArgs: [],
    arguments: ['cool-app'],
  },
  {
    argv: minimist(['list', 'query']),
    command: tree.list,
    requiredArgs: [],
    optionalArgs: ['query'],
    arguments: ['query'],
  },
  {
    argv: minimist(['login', 'bestever', 'me@there.com']),
    command: tree.login,
    requiredArgs: ['bestever'],
    optionalArgs: ['me@there.com'],
    arguments: ['bestever', 'me@there.com'],
  },
  {
    argv: minimist(['login', 'bestever', 'me@there.com', 'extra']),
    command: tree.login,
    requiredArgs: ['bestever'],
    optionalArgs: ['me@there.com'],
    arguments: ['bestever', 'me@there.com'],
  },
]

cases.forEach((c) => {
  test(`finds ${c.argv._.join(', ')}`, t => {
    const found = find(tree, c.argv)
    t.true(found.command === c.command)
    t.deepEqual(found.requiredArgs, c.requiredArgs)
    t.deepEqual(found.optionalArgs, c.optionalArgs)
    t.true(found.argv === c.argv)
  })

  test(`runs ${c.argv._.join(', ')}`, t => {
    const _this = {}
    const found = {
      argv: c.argv,
      command: {
        handler: function (...args) {
          // Passes argv as last argument
          t.deepEqual(args, c.arguments.concat(c.argv))
          // Preserves context
          t.true(this === _this)
        },
      },
      requiredArgs: c.requiredArgs,
      optionalArgs: c.optionalArgs,
    }
    t.plan(2)
    run.call(_this, found)
  })
})

test('fails if not given required args', t => {
  const argv = minimist(['workspace', 'new'])
  t.throws(() => find(tree, argv), MissingRequiredArgsError)
})

test('fails if not given existing command', t => {
  const argv = minimist(['workspace', 'foo'])
  t.throws(() => find(tree, argv), CommandNotFoundError)
})
