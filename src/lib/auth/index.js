import Q from 'q';
import fs from 'fs';
import { askAccountAndLogin, askPassword, createWorkspace, saveCredentials } from './login';
import { getCredentialsPath, getCurrentCredentials, isTokenValid } from './credentials';

export function login() {
  return askAccountAndLogin()
    .then(askPassword)
    .then(createWorkspace)
    .then(saveCredentials)
    .catch((error) => {
      throw new Error(error);
    });
}

export function getValidCredentials() {
  return getCurrentCredentials()
    .then((credentials) => {
      return isTokenValid(credentials)
        .then((validToken) => {
          if (!validToken) return login();
          return credentials;
        });
    }).catch((error) => {
      if (error.code === 'ENOENT') {
        return login();
      }
      throw new Error('Error while trying to get credentials file \n' + JSON.stringify(error));
    });
}

export function logout() {
  return Q.nfcall(fs.unlink, getCredentialsPath());
}
