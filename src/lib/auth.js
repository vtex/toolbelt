import path from 'path';
import fs from 'fs';
import Q from 'q';
import request from 'request';
import prompt from 'prompt';

class AuthenticationService {

  login = () => {
    return this.askCredentials()
      .then(this.createWorkspace)
      .then(this.saveCredentials)
      .catch((error) => {
        throw new Error(error);
      });
  }

  getValidCredentials = () => {
    return this.getCurrentCredentials().then((credentials) => {
      return this.isTokenValid(credentials).then((validToken) => {
        if (!validToken) {
          return this.login();
        }
        return credentials;
      });
    });
  }

  askCredentials = () => {
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
          console.log('\nWe sent you an e-mail with your access token, please use it!');

          this.sendCodeToEmail(result.login).then((token) => {
            let startToken = token;
            let isUsingToken = true;
            this.getAccessKey(isUsingToken).then((code) => {
              this.getEmailAuthenticationToken(result.login, startToken, code).then((token) => {
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
          this.getAccessKey().then((password) => {
            this.getAuthenticationToken(result.login, password).then((token) => {
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

  getAuthenticationToken = (email, password) => {
    var deferred;
    deferred = Q.defer();

    this.getTemporaryToken().then((token) => {
      let requestOptions = {
        uri: 'https://vtexid.vtex.com.br/api/vtexid/pub/authentication/classic/validate' + ('?authenticationToken=' + (encodeURIComponent(token))) + ('&login=' + (encodeURIComponent(email))) + ('&password=' + (encodeURIComponent(password)))
      };

      request(requestOptions, (error, response, body) => {
        if (error) {
          this.logErrorAndExit(error);
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

  getCurrentCredentials = () => {
    let credentials = Q.nfcall(fs.readFile, this.getCredentialsPath(), 'utf8')
      .then(JSON.parse)
      .catch(() => {});

    return credentials;
  }

  isTokenValid = (credentials) => {
    let deferred = Q.defer();
    let requestOptions = {
      uri: 'https://vtexid.vtex.com.br/api/vtexid/pub/authenticated/user?authToken=' + (encodeURIComponent(credentials.token))
    };

    request(requestOptions, (error, response, body) => {
      if (error) {
        this.logErrorAndExit(error);
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
      } catch (_error) {
        error = _error;
        return deferred.reject('Invalid JSON while getting token from VTEX ID');
      }
    });

    return deferred.promise;
  }

  saveCredentials = (credentials) => {
    let content = JSON.stringify(credentials, null, 2);
    let credentialsPath = path.dirname(this.getCredentialsPath());

    const writeCredentials = (err) => {
      const folderExist = err && err.code === 'EEXIST';
      if (!err || folderExist) {
        return Q.nfcall(fs.writeFile, this.getCredentialsPath(), content);
      }
      throw err;
    };

    Q.nfcall(fs.mkdir, credentialsPath).finally(writeCredentials);

    return credentials;
  }

  deleteCredentials = () => {
    return Q.nfcall(fs.unlink, this.getCredentialsPath());
  }

  getTemporaryToken = () => {
    let deferred = Q.defer();
    let requestOptions = {
      uri: 'https://vtexid.vtex.com.br/api/vtexid/pub/authentication/start'
    };

    request(requestOptions, (error, response, body) => {
      if (error) {
        this.logErrorAndExit(error);
      } else if (response.statusCode !== 200) {
        console.log(JSON.parse(body).error);
        deferred.reject('Invalid status code ' + response.statusCode);
      }

      try {
        let token = JSON.parse(body).authenticationToken;
        deferred.resolve(token);
      } catch (_error) {
        return deferred.reject('Invalid JSON while getting token from VTEX ID');
      }
    });

    return deferred.promise;
  };

  getCredentialsPath = () => {
    const home = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
    return path.resolve(home, '.vtex/credentials.json');
  }

  logErrorAndExit = (error) => {
    if (error.code === 'ENOTFOUND') {
      console.log(('Address ' + error.hostname + ' not found').red + '\nAre you online?'.yellow);
    } else {
      console.log(error);
    }

    return process.exit(1);
  }

  createWorkspace = (credentials) => {
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

  sendCodeToEmail = (email) => {
    let deferred = Q.defer();

    this.getTemporaryToken().then((token) => {
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

  getAccessKey = (isUsingToken = false) => {
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

  getEmailAuthenticationToken = (email, token, code) => {
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
}

let auth = new AuthenticationService();

export default {
  login: auth.login,
  logout: auth.deleteCredentials,
  getValidCredentials: auth.getValidCredentials,
  askCredentials: auth.askCredentials
};
