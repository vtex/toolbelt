import test from 'ava'
import minimist from 'minimist'
import {find, run, CommandNotFoundError, MissingRequiredArgsError} from './runner'

const tree = {
  'login': {
    handler: () => {},
    'requires': 'store',
  },
  'logout': {
    handler: () => {},
  },
  'list': {
    'alias': 'ls',
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

test('finds command on root', t => {
  const argv = minimist(['list'])
  const command = tree.list
  t.true(find(tree, argv).command === command)
})

test('finds command on namespace', t => {
  const argv = minimist(['workspace', 'list'])
  const command = tree.workspace.list
  t.true(find(tree, argv).command === command)
})

test('finds required args', t => {
  const argv = minimist(['install', 'cool-app'])
  const command = tree.install
  const args = ['cool-app']
  const found = find(tree, argv)
  t.true(found.command === command)
  t.deepEqual(found.requires, args)
})

test('fails if not given required args', t => {
  const argv = minimist(['workspace', 'new'])
  t.throws(() => find(tree, argv), MissingRequiredArgsError)
})

test('fails if not given existing command', t => {
  const argv = minimist(['workspace', 'foo'])
  t.throws(() => find(tree, argv), CommandNotFoundError)
})

test('runs command with args', t => {
  const found = {
    command: tree.install,
    requires: ['cool-app'],
    options: [],
  }
  found.command.handler = (app) => t.is('cool-app', app)
  t.plan(1)
  run(found)
})
