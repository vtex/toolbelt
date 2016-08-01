import test from 'ava'
import winston from './logger'

test('winston is exported', t => {
  t.truthy(winston)
})
