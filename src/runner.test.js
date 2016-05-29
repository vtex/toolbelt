import test from 'ava'
import minimist from 'minimist'
import {omit} from 'ramda'
import {find, run, MissingRequiredArgsError} from './runner'

const tree = {
  'options': [
    {
      'long': 'verbose',
      'description': 'show all logs',
      'type': 'boolean',
    },
    {
      'short': 'h',
      'long': 'help',
      'description': 'show help information',
      'type': 'boolean',
    },
  ],
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
    'options': [
      {
        'short': 'a',
        'long': 'all',
        'description': 'show hidden',
        'type': 'boolean',
      },
    ],
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
    argv: minimist(['--verbose']),
    command: null,
    requiredArgs: [],
    optionalArgs: [],
    options: {
      verbose: true,
    },
    arguments: [],
  },
  {
    argv: minimist(['list']),
    command: tree.list,
    requiredArgs: [],
    optionalArgs: [],
    options: {},
    arguments: [],
  },
  {
    argv: minimist(['list', '-a']),
    command: tree.list,
    requiredArgs: [],
    optionalArgs: [],
    options: {
      a: true,
    },
    arguments: [],
  },
  {
    argv: minimist(['workspace', 'list']),
    command: tree.workspace.list,
    requiredArgs: [],
    optionalArgs: [],
    options: {},
    arguments: [],
  },
  {
    argv: minimist(['install', 'cool-app']),
    command: tree.install,
    requiredArgs: ['cool-app'],
    optionalArgs: [],
    options: {},
    arguments: ['cool-app'],
  },
  {
    argv: minimist(['i', 'cool-app']),
    command: tree.install,
    requiredArgs: ['cool-app'],
    optionalArgs: [],
    options: {},
    arguments: ['cool-app'],
  },
  {
    argv: minimist(['list', 'query']),
    command: tree.list,
    requiredArgs: [],
    optionalArgs: ['query'],
    options: {},
    arguments: ['query'],
  },
  {
    argv: minimist(['login', 'bestever', 'me@there.com']),
    command: tree.login,
    requiredArgs: ['bestever'],
    optionalArgs: ['me@there.com'],
    options: {},
    arguments: ['bestever', 'me@there.com'],
  },
  {
    argv: minimist(['login', 'bestever', 'me@there.com', 'extra']),
    command: tree.login,
    requiredArgs: ['bestever'],
    optionalArgs: ['me@there.com'],
    options: {},
    arguments: ['bestever', 'me@there.com'],
  },
  {
    argv: minimist(['workspace', 'foo']),
    command: null,
    requiredArgs: [],
    optionalArgs: [],
    options: {},
    arguments: [],
  },
]

cases.forEach((c) => {
  test(`finds ${c.argv._.join(', ')}`, t => {
    const found = find(tree, c.argv)
    t.true(found.command === c.command)
    t.deepEqual(found.requiredArgs, c.requiredArgs)
    t.deepEqual(found.optionalArgs, c.optionalArgs)
    t.deepEqual(found.options, c.options)
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
          // Check that argv contains options
          t.deepEqual(omit(['_'], c.argv), c.options)
          // Preserves context
          t.true(this === _this)
        },
      },
      requiredArgs: c.requiredArgs,
      optionalArgs: c.optionalArgs,
    }
    t.plan(3)
    run.call(_this, found)
  })
})

test('fails if not given required args', t => {
  const argv = minimist(['workspace', 'new'])
  t.throws(() => find(tree, argv), MissingRequiredArgsError)
})
