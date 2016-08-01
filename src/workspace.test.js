import test from 'ava'
import {getWorkspaceURL} from './workspace'

test('makes a development workspace from the login email', t => {
  const account = 'dreamstore'
  const workspace = 'test'
  const expected = `http://${account}.alpha.myvtex.com/?vtex_workspace=${workspace}`
  const actual = getWorkspaceURL(account, workspace)
  t.is(actual, expected)
})
