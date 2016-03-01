import path from 'path';
import request from 'request';
import Q from 'q';
import fs from 'fs';
import prompt from 'prompt';
import { getErrorMessage } from './utils';
import { getCredentialsPath } from './credentials';
import chalk from 'chalk';

export function askAccountAndLogin() {
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
  console.log(chalk.green('Please log in with your VTEX credentials:\n') +
              'account  - The store account you want to be developing on\n' +
              'login    - Your VTEX registered email\n' +
              'password - Your VTEX registered password\n');

  prompt.get(options, (err, result) => {
    if (err || !(result && result.login && result.account)) {
      console.log('\nLogin failed. Please try again.');
      return deferred.reject(err);
    }

    return deferred.resolve(result);
  });

  return deferred.promise;
}

export function askPassword(result) {
  let deferred = Q.defer();

  if (result.login.indexOf('@vtex.com') !== -1) {
    vtexUserAuth(result).then((token) => {
      return deferred.resolve({
        email: result.login,
        token: token,
        account: result.account
      });
    });
  } else {
    userAuth(result).then((token) => {
      return deferred.resolve({
        email: result.login,
        token: token,
        account: result.account
      });
    });
  }

  return deferred.promise;
}

function vtexUserAuth(result) {
  let deferred = Q.defer();
  console.log('\nWe\'ve sent you an e-mail with your access token, please use it!');

  sendCodeToEmail(result.login).then((startToken) => {
    const isUsingToken = true;
    getAccessKey(isUsingToken).then((code) => {
      getEmailAuthenticationToken(result.login, startToken, code)
      .then(deferred.resolve)
      .catch(deferred.reject);
    });
  });

  return deferred.promise;
}

function userAuth(result) {
  let deferred = Q.defer();

  getAccessKey().then((password) => {
    getAuthenticationToken(result.login, password)
    .then(deferred.resolve)
    .catch(deferred.reject);
  });

  return deferred.promise;
}

export function createWorkspace(credentials) {
  let deferred = Q.defer();
  let options = {
    url: 'http://workspaces.vtex.com/' + credentials.account + '/workspaces',
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
    if (error || !(response.statusCode === 201 || response.statusCode === 409)) {
      return deferred.reject(getErrorMessage(error, response, 'creating workspace'));
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
      if (error || response.statusCode !== 200 || response.statusCode >= 400) {
        return deferred.reject(getErrorMessage(error, response, 'authenticating'));
      }

      try {
        let auth = JSON.parse(body);
        if (auth.authStatus !== 'Success') {
          deferred.reject(chalk.red('Authentication has failed with status ' + auth.authStatus));
        }
        deferred.resolve(auth.authCookie.Value);
      } catch (_error) {
        deferred.reject(chalk.red('Invalid JSON while authenticating with VTEX ID'));
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
      if (error || response.statusCode !== 200 || response.statusCode >= 400) {
        return deferred.reject(getErrorMessage(error, response, 'sending access token'));
      }

      deferred.resolve(token);
    });
  });

  return deferred.promise;
}

function getAccessKey(isUsingToken = false) {
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

  if (isUsingToken) {
    options.properties.password.hidden = false;
    options.properties.password.message = 'access token';
  }

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
    if (error || response.statusCode !== 200 || response.statusCode >= 400) {
      return deferred.reject(getErrorMessage(error, response, 'authenticating'));
    }

    try {
      let auth = JSON.parse(body);
      if (auth.authStatus !== 'Success') {
        deferred.reject(chalk.red('Authentication has failed with status ' + auth.authStatus));
      }
      return deferred.resolve(auth.authCookie.Value);
    } catch (_error) {
      return deferred.reject(chalk.red('Invalid JSON while authenticating with VTEX ID'));
    }
  });

  return deferred.promise;
}

function getTemporaryToken() {
  let deferred = Q.defer();
  let requestOptions = {
    uri: 'https://vtexid.vtex.com.br/api/vtexid/pub/authentication/start?callbackUrl='
  };

  request(requestOptions, (error, response, body) => {
    if (error || response.statusCode !== 200 || response.statusCode >= 400) {
      return deferred.reject(getErrorMessage(error, response, 'authenticating'));
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
