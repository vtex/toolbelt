import test from 'ava'
import {getWorkspaceURL} from './workspace'

test('makes a development workspace from the login email', t => {
  process.env.VTEX_ENV = 'stable'
  const account = 'dreamstore'
  const workspace = 'test'
  const expected = `http://${account}.myvtex.com/?workspace=${workspace}`
  const actual = getWorkspaceURL(account, workspace)
  t.is(actual, expected)
})
