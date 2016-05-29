import test from 'ava'
import {
  commandTree,
} from './index'

const modules = [
  {
    default: {
      login: {
        requiredArgs: 'store',
        handler: () => {},
      },
      logout: {
        handler: () => {},
      },
    },
  },
  {
    default: {
      list: {
        alias: 'ls',
        handler: () => {},
      },
      install: {
        requiredArgs: 'app',
        alias: 'i',
        handler: () => {},
      },
      uninstall: {
        requiredArgs: 'app',
        handler: () => {},
      },
      publish: {
        requiredArgs: 'app',
        handler: () => {},
      },
    },
  },
  {
    default: {
      workspace: {
        new: {
          requiredArgs: 'name',
          handler: () => {},
        },
        delete: {
          requiredArgs: 'name',
          handler: () => {},
        },
        promote: {
          requiredArgs: 'name',
          handler: () => {},
        },
      },
    },
  },
]

const tree = commandTree(modules)

test('makes command tree from imported modules', t => {
  t.truthy(tree.login.handler)
  t.truthy(tree.list.handler)
  t.truthy(tree.workspace.new.handler)
})
