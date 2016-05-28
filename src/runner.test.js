import test from 'ava'
import minimist from 'minimist'
import {find, run, CommandNotFoundError, MissingRequiredArgsError} from './runner'

const tree = {
  'login': {
    'requires': 'store',
    'options': 'email',
    handler: () => {},
  },
  'logout': {
    handler: () => {},
  },
  'list': {
    'alias': 'ls',
    'options': 'query',
    handler: () => {},
  },
  'install': {
    'requires': 'app',
    'alias': 'i',
    handler: () => {},
  },
  'uninstall': {
    'requires': 'app',
    handler: () => {},
  },
  'publish': {
    'requires': 'app',
    handler: () => {},
  },
  'workspace': {
    'new': {
      'requires': 'name',
      handler: () => {},
    },
    'delete': {
      'requires': 'name',
      handler: () => {},
    },
    'promote': {
      'requires': 'name',
      handler: () => {},
    },
    'list': {
      handler: () => {},
    },
  },
}

const finds = [
  {
    argv: minimist(['list']),
    command: tree.list,
    requires: [],
    options: [],
    arguments: [],
  },
  {
    argv: minimist(['workspace', 'list']),
    command: tree.workspace.list,
    requires: [],
    options: [],
    arguments: [],
  },
  {
    argv: minimist(['install', 'cool-app']),
    command: tree.install,
    requires: ['cool-app'],
    options: [],
    arguments: ['cool-app'],
  },
  {
    argv: minimist(['i', 'cool-app']),
    command: tree.install,
    requires: ['cool-app'],
    options: [],
    arguments: ['cool-app'],
  },
  {
    argv: minimist(['list', 'query']),
    command: tree.list,
    requires: [],
    options: ['query'],
    arguments: ['query'],
  },
  {
    argv: minimist(['login', 'bestever', 'me@there.com']),
    command: tree.login,
    requires: ['bestever'],
    options: ['me@there.com'],
    arguments: ['bestever', 'me@there.com'],
  },
  {
    argv: minimist(['login', 'bestever', 'me@there.com', 'extra']),
    command: tree.login,
    requires: ['bestever'],
    options: ['me@there.com'],
    arguments: ['bestever', 'me@there.com'],
  },
]
finds.forEach((c) => {
  test(`finds ${c.argv._.join(', ')}`, t => {
    const found = find(tree, c.argv)
    t.true(found.command === c.command)
    t.deepEqual(found.requires, c.requires)
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
          // Preserves context
          t.true(this === _this)
        },
      },
      requires: c.requires,
      options: c.options,
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
