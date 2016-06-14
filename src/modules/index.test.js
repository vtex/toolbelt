import test from 'ava'
import {tree} from './index'

test('makes command tree from imported modules', t => {
  t.truthy(tree.handler)
  t.truthy(tree.options)
  t.truthy(tree.login.handler)
  t.truthy(tree.list.handler)
  t.truthy(tree.workspace.create.handler)
})
