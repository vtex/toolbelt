import path from 'path';
import request from 'request';
import Q from 'q';
import fs from 'fs';

export function getCredentialsPath() {
  const home = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
  return path.resolve(home, '.vtex/credentials.json');
}

export function getCurrentCredentials() {
  let credentials = Q.nfcall(fs.readFile, getCredentialsPath(), 'utf8')
    .then(JSON.parse)
    .catch(() => {});

  return credentials;
}

export function isTokenValid(credentials) {
  let deferred = Q.defer();
  let requestOptions = {
    uri: 'https://vtexid.vtex.com.br/api/vtexid/pub/authenticated/user?authToken=' + (encodeURIComponent(credentials.token))
  };

  request(requestOptions, (error, response, body) => {
    if (error) {
      logErrorAndExit(error);
    } else if (response.statusCode !== 200) {
      console.log(JSON.parse(body).error);
      deferred.reject('Invalid status code ' + response.statusCode);
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

function logErrorAndExit(error) {
  if (error.code === 'ENOTFOUND') {
    console.log(('Address ' + error.hostname + ' not found').red + '\nAre you online?'.yellow);
  } else {
    console.log(error);
  }

  return process.exit(1);
}
