import Q from 'q';
import fs from 'fs';
import { askCredentials, createWorkspace, saveCredentials} from './login';
import { getCredentialsPath, getCurrentCredentials, isTokenValid } from './credentials';

export function login() {
  return askCredentials()
    .then(createWorkspace)
    .then(saveCredentials)
    .catch((error) => {
      throw new Error(error);
    });
}

export function getValidCredentials() {
  return getCurrentCredentials().then((credentials) => {
    return isTokenValid(credentials).then((validToken) => {
      if (!validToken) {
        return login();
      }
      return credentials;
    });
  });
}

export function logout() {
  return Q.nfcall(fs.unlink, getCredentialsPath());
}
