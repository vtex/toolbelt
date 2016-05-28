import test from 'ava'
import {
  commandTree,
} from './index'

const modules = [
  {
    default: {
      login: {
        requires: 'store',
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
        requires: 'app',
        alias: 'i',
        handler: () => {},
      },
      uninstall: {
        requires: 'app',
        handler: () => {},
      },
      publish: {
        requires: 'app',
        handler: () => {},
      },
    },
  },
  {
    default: {
      workspace: {
        new: {
          requires: 'name',
          handler: () => {},
        },
        delete: {
          requires: 'name',
          handler: () => {},
        },
        promote: {
          requires: 'name',
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
