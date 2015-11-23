import path from 'path';
import request from 'request';
import Q from 'q';
import fs from 'fs';
import { getErrorMessage } from './utils';

export function getCredentialsPath() {
  const home = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
  return path.resolve(home, '.vtex/credentials.json');
}

export function getCurrentCredentials() {
  let deferred = Q.defer();

  Q.nfcall(fs.readFile, getCredentialsPath(), 'utf8')
    .then(JSON.parse)
    .then(deferred.resolve)
    .catch(deferred.reject);

  return deferred.promise;
}

export function isTokenValid(credentials) {
  let deferred = Q.defer();
  let requestOptions = {
    uri: 'https://vtexid.vtex.com.br/api/vtexid/pub/authenticated/user?authToken=' + (encodeURIComponent(credentials.token))
  };

  request(requestOptions, (error, response, body) => {
    if (error || response.statusCode !== 200 || response.statusCode >= 400) {
      return deferred.reject(getErrorMessage(error, response, 'authenticating'));
    }

    try {
      let vtexIdUser = JSON.parse(body);
      if (vtexIdUser === null) {
        return deferred.resolve(false);
      }
      let user = vtexIdUser.user;
      if (user !== null && user === credentials.email) {
        return deferred.resolve(true);
      }
    } catch (err) {
      return deferred.reject('Invalid JSON while getting token from VTEX ID');
    }
  });

  return deferred.promise;
}
