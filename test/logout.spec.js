import { mockFs } from './helpers/setup';
import { getCredentialsPath } from '../src/lib/auth/credentials';
import { logout } from '../src/lib/auth';

describe('Logout', () => {

  before(() => {
    mockFs({
      [getCredentialsPath()]: JSON.stringify({
        account: 'testAccountName',
        email: 'test@mail.com',
        token: 'bigtoken'
      })
    });
  });

  after(() => mockFs.restore());

  it('should logout', (done) => {
    logout().should.be.fulfilled.and.notify(done);
  });

  it('should not logout when there\'s no credentials file', (done) => {
    logout().should.be.rejected.and.notify(done);
  });
});
