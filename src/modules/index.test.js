import 'babel-polyfill'
import test from 'ava'
import tree from './index'

test('makes command tree from imported modules', t => {
  t.truthy(tree.handler)
  t.truthy(tree.options)
  t.truthy(tree.login.module)
  t.truthy(tree.list.module)
  t.truthy(tree.workspace.create.module)
})
