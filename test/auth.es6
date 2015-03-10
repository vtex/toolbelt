let expect = require('chai').expect;
let auth = require('../src/lib/auth');

describe('auth service', function() {
  return it('should exist', function(done) {
    expect(auth).to.be.ok;
    expect(auth.login()).to.be.ok;
    return done();
  });
});
