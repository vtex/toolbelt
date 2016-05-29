import test from 'ava'
import minimist from 'minimist'
import {pick, keys} from 'ramda'
import {
  find,
  run,
  findOptions,
  optionsByType,
  filterCommands,
  filterNamespaces,
  filterOptions,
  MissingRequiredArgsError,
} from './finder'

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
      'options': [
        {
          'short': 'a',
          'long': 'account',
          'type': 'string',
        },
      ],
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
    argv: ['--verbose'],
    command: null,
    requiredArgs: [],
    optionalArgs: [],
    options: {
      verbose: true,
    },
    arguments: [],
  },
  {
    argv: ['list'],
    command: tree.list,
    requiredArgs: [],
    optionalArgs: [],
    options: {},
    arguments: [],
  },
  {
    argv: ['list', '-a'],
    command: tree.list,
    requiredArgs: [],
    optionalArgs: [],
    options: {
      a: true,
    },
    arguments: [],
  },
  {
    argv: ['workspace', 'list'],
    command: tree.workspace.list,
    requiredArgs: [],
    optionalArgs: [],
    options: {},
    arguments: [],
  },
  {
    argv: ['install', 'cool-app'],
    command: tree.install,
    requiredArgs: ['cool-app'],
    optionalArgs: [],
    options: {},
    arguments: ['cool-app'],
  },
  {
    argv: ['i', 'cool-app'],
    command: tree.install,
    requiredArgs: ['cool-app'],
    optionalArgs: [],
    options: {},
    arguments: ['cool-app'],
  },
  {
    argv: ['list', 'query'],
    command: tree.list,
    requiredArgs: [],
    optionalArgs: ['query'],
    options: {},
    arguments: ['query'],
  },
  {
    argv: ['login', 'bestever', 'me@there.com'],
    command: tree.login,
    requiredArgs: ['bestever'],
    optionalArgs: ['me@there.com'],
    options: {},
    arguments: ['bestever', 'me@there.com'],
  },
  {
    argv: ['login', 'bestever', 'me@there.com', 'extra'],
    command: tree.login,
    requiredArgs: ['bestever'],
    optionalArgs: ['me@there.com'],
    options: {},
    arguments: ['bestever', 'me@there.com'],
  },
  {
    argv: ['workspace', 'foo'],
    command: undefined,
    requiredArgs: [],
    optionalArgs: [],
    options: {},
    arguments: [],
  },
  {
    argv: ['workspace', 'delete', 'app', '-a', 'test'],
    command: tree.workspace.delete,
    requiredArgs: ['app'],
    optionalArgs: [],
    options: {
      a: 'test',
    },
    arguments: ['app'],
  },
]

cases.forEach((c) => {
  test(`finds ${c.argv.join(', ')}`, t => {
    const found = find(tree, c.argv, minimist)
    t.is(found.command, c.command)
    t.deepEqual(found.requiredArgs, c.requiredArgs)
    t.deepEqual(found.optionalArgs, c.optionalArgs)
    t.deepEqual(pick(keys(c.options), found.options), c.options)
    t.deepEqual(found.argv, minimist(c.argv, optionsByType(findOptions(found.command || found.node))))
  })

  test(`runs ${c.argv.join(', ')}`, t => {
    const _this = {}
    const _argv = {}
    const found = {
      argv: _argv,
      command: {
        handler: function (...args) {
          // Passes argv as last argument
          t.deepEqual(args, c.arguments.concat(_argv))
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
  t.throws(() => find(tree, ['workspace', 'new'], minimist), MissingRequiredArgsError)
})

test('finds options', t => {
  const options = findOptions(tree)
  t.true(options.indexOf(tree.options[0]) >= 0)
  t.true(options.indexOf(tree.options[1]) >= 0)
  t.true(options.indexOf(tree.list.options[0]) === -1)
})

test('groups options by type', t => {
  const options = findOptions(tree)
  const types = optionsByType(options);
  ['verbose', 'h', 'help']
  .forEach(o => t.true(types.boolean.indexOf(o) >= 0))
})

test('filters commands', t => {
  const commands = filterCommands(tree)
  t.true(commands.login === tree.login)
})

test('filters namespaces', t => {
  const namespaces = filterNamespaces(tree)
  t.true(namespaces.workspace === tree.workspace)
})

test('filters options', t => {
  const options = filterOptions(tree)
  t.true(options.options === tree.options)
})
