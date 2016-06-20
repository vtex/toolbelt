import test from 'ava'
import {getDevWorkspace} from './workspace'

const workspace = getDevWorkspace('foo@bar.com.br')

test('makes a development workspace from the login email', t => {
  t.is(workspace, 'sb_foo@bar.com.br')
})
