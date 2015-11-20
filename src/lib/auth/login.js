import path from 'path';
import request from 'request';
import Q from 'q';
import fs from 'fs';
import prompt from 'prompt';
import { getCredentialsPath } from './credentials';

export function askCredentials() {
  let deferred = Q.defer();
  let options = {
    properties: {
      account: {
        pattern: /^[\w\-]+$/,
        message: 'Must not contain spaces',
        required: true
      },
      login: {
        format: 'email',
        message: 'Must be a valid email',
        required: true
      }
    }
  };
  prompt.message = '> ';
  prompt.delimiter = '';

  prompt.start();
  console.log('Please log in with your VTEX credentials:\n'.green +
              'account  - The store account you want to be developing on\n' +
              'login    - Your VTEX registered email\n' +
              'password - Your VTEX registered password\n');

  prompt.get(options, (err, result) => {
    if (err) console.log('\nLogin failed. Please try again.');

    if (result && result.login && result.account) {
      if (result.login.indexOf('@vtex.com') !== -1) {
        console.log('\nWe sent you an e-mail with your code, please use it!');

        sendCodeToEmail(result.login).then((token) => {
          let startToken = token;
          getAccessKey().then((code) => {
            getEmailAuthenticationToken(result.login, startToken, code).then((token) => {
              deferred.resolve({
                email: result.login,
                token: token,
                account: result.account
              });
            }).catch(function(error) {
              deferred.reject(error);
            });
          });
        });
      } else {
        getAccessKey().then((password) => {
          getAuthenticationToken(result.login, password).then((token) => {
            return deferred.resolve({
              email: result.login,
              token: token,
              account: result.account
            });
          }).catch((error) => {
            deferred.reject(error);
          });
        });
      }
    } else {
      return deferred.reject(result);
    }
  });

  return deferred.promise;
}

export function createWorkspace(credentials) {
  let deferred = Q.defer();
  let options = {
    url: 'http://api.beta.vtex.com/' + credentials.account + '/workspaces',
    method: 'POST',
    headers: {
      Authorization: 'token ' + credentials.token,
      Accept: 'application/vnd.vtex.gallery.v0+json',
      'Content-Type': 'application/json'
    },
    json: {
      name: 'sb_' + credentials.email
    }
  };

  request(options, (error, response) => {
    var ref;
    if (error || ((ref = response.statusCode) !== 200 && ref !== 201 && ref !== 409)) {
      deferred.reject();
      console.log(error || response.body.message);
      process.exit(1);
    }
    return deferred.resolve(credentials);
  });

  return deferred.promise;
}

export function saveCredentials(credentials) {
  let content = JSON.stringify(credentials, null, 2);
  let credentialsPath = path.dirname(getCredentialsPath());

  const writeCredentials = (err) => {
    const folderExist = err && err.code === 'EEXIST';
    if (!err || folderExist) {
      return Q.nfcall(fs.writeFile, getCredentialsPath(), content);
    }
    throw err;
  };

  Q.nfcall(fs.mkdir, credentialsPath).finally(writeCredentials);

  return credentials;
}

function getAuthenticationToken(email, password) {
  var deferred;
  deferred = Q.defer();

  getTemporaryToken().then((token) => {
    let requestOptions = {
      uri: 'https://vtexid.vtex.com.br/api/vtexid/pub/authentication/classic/validate' + ('?authenticationToken=' + (encodeURIComponent(token))) + ('&login=' + (encodeURIComponent(email))) + ('&password=' + (encodeURIComponent(password)))
    };

    request(requestOptions, (error, response, body) => {
      if (error) {
        logErrorAndExit(error);
      } else if (response.statusCode !== 200) {
        console.log(JSON.parse(body).error);
        deferred.reject('Invalid status code ' + response.statusCode);
      }

      try {
        let auth = JSON.parse(body);
        if (auth.authStatus !== 'Success') {
          deferred.reject(('Authentication has failed with status ' + auth.authStatus).red);
        }
        deferred.resolve(auth.authCookie.Value);
      } catch (_error) {
        deferred.reject('Invalid JSON while authenticating with VTEX ID'.red);
      }
    });
  });

  return deferred.promise;
}

function sendCodeToEmail(email) {
  let deferred = Q.defer();

  getTemporaryToken().then((token) => {
    let options = {
      url: 'https://vtexid.vtex.com.br/api/vtexid/pub/authentication/accesskey/' + ('send?authenticationToken=' + token + '&email=' + email),
      method: 'GET'
    };

    request(options, (error, response) => {
      if (error || response.statusCode !== 200) {
        deferred.reject();
        console.log(error || response.body.message);
        process.exit(1);
      }
      deferred.resolve(token);
    });
  });

  return deferred.promise;
}

function getAccessKey() {
  let deferred = Q.defer();
  let options = {
    properties: {
      password: {
        hidden: true,
        message: 'password (typing will be hidden)',
        required: true
      }
    }
  };
  prompt.message = '> ';
  prompt.delimiter = '';
  prompt.start();

  prompt.get(options, (err, result) => {
    if (err) console.log('\nLogin failed. Please try again.');

    if (result && result.password) {
      return deferred.resolve(result.password);
    }

    return deferred.reject;
  });

  return deferred.promise;
}

function getEmailAuthenticationToken(email, token, code) {
  let deferred = Q.defer();
  let options = {
    url: 'https://vtexid.vtex.com.br/api/vtexid/pub/authentication/accesskey/' + ('validate?&login=' + email + '&accesskey=' + code) + ('&authenticationToken=' + token),
    method: 'GET'
  };

  request(options, (error, response, body) => {
    if (error || response.statusCode !== 200) {
      deferred.reject();
      console.log(error || response.body.message);
      process.exit(1);
    }
    try {
      let auth = JSON.parse(body);
      if (auth.authStatus !== 'Success') {
        deferred.reject(('Authentication has failed with status ' + auth.authStatus).red);
      }
      return deferred.resolve(auth.authCookie.Value);
    } catch (_error) {
      return deferred.reject('Invalid JSON while authenticating with VTEX ID'.red);
    }
  });

  return deferred.promise;
}

function getTemporaryToken() {
  let deferred = Q.defer();
  let requestOptions = {
    uri: 'https://vtexid.vtex.com.br/api/vtexid/pub/authentication/start'
  };

  request(requestOptions, (error, response, body) => {
    if (error) {
      logErrorAndExit(error);
    } else if (response.statusCode !== 200) {
      console.log(JSON.parse(body).error);
      deferred.reject('Invalid status code ' + response.statusCode);
    }

    try {
      let token = JSON.parse(body).authenticationToken;
      deferred.resolve(token);
    } catch (err) {
      return deferred.reject('Invalid JSON while getting token from VTEX ID');
    }
  });

  return deferred.promise;
}
