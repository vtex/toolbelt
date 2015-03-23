expect = require('chai').expect
auth = require '../src/lib/auth'

describe 'auth service', ->
  it 'should exist', (done) ->
    expect(auth).to.be.ok
    expect(auth.login()).to.be.ok
    done()
