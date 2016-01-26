import Q from 'q';
import path from 'path';
import fs from 'fs';
import request from 'request';
import chokidar from 'chokidar';
import { listFiles } from './file-manager';
import tinylr from 'tiny-lr';
import crypto from 'crypto';
import net from 'net';
import shell from 'shelljs';
import {
  getSandboxFiles,
  passToChanges,
  generateFilesHash } from './file-hash-generator';
import {
  buildSetUpChanges,
  filterSourceChanges,
  filterSourceFiles,
  isRouteFile,
  isComponentFile,
  isAreaFile } from './changes-migrator';

export default class Watcher {
  constructor(app, vendor, credentials, isServerSet, isMigrateSet) {
    this.ChangeAction = {
      Save: 'save',
      Remove: 'remove'
    };
    this.changes = {};
    this.lastBatch = 0;
    this.lrPortInUse = false;

    this.app = app;
    this.vendor = vendor;
    this.credentials = credentials;
    this.isServerSet = isServerSet;
    this.isMigrateSet = isMigrateSet;
    this.token = credentials.token;

    this.endpoint = 'http://api.beta.vtex.com';
    this.acceptHeader = 'application/vnd.vtex.workspaces.v0+json';
    this.sandbox = this.credentials.email;
    this.workspace = 'sb_' + this.credentials.email;
    this.lrRun(35729);

    if (process.platform === 'win32') {
      let rl = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      rl.on('SIGINT', function() {
        return process.emit('SIGINT');
      });
    }

    process.on('SIGINT', () => {
      console.log('\nExiting...');
      return this.deactivateSandbox();
    });
  };

  watch = () => {
    let ref;
    let root = process.cwd();
    let usePolling = (ref = process.platform === 'win32') != null ? ref : false;
    this.activateSandbox();

    return listFiles().then((result) => {
      let deferred = Q.defer();

      if (result.endpoint) this.endpoint = result.endpoint;
      if (result.header) this.acceptHeader = result.header;

      let ignore = [];
      result.ignore.forEach((ignorePath) => {
        ignore.push(path.join(root, ignorePath));
      });

      let watcher = chokidar.watch(root, {
        persistent: true,
        usePolling: usePolling,
        ignoreInitial: true,
        ignored: ignore
      });

      watcher
        .on('add', this.onAdded)
        .on('addDir', this.onDirAdded)
        .on('change', this.onChanged)
        .on('unlink', this.onUnlinked)
        .on('unlinkDir', this.onDirUnlinked)
        .on('error', (error) => deferred.reject(error))
        .on('ready', () => {
          this.getFilesChanges(result.files).done((filesChanges) => {
            for (let filePath in filesChanges) {
              let changeAction = filesChanges[filePath];
              let rootFilePath = path.resolve(root, filePath);
              this.changes[rootFilePath] = changeAction;
            }
            this.debounce(true);
            deferred.resolve({ app: this.app });
          });
        });

      return deferred.promise;
    });
  };

  onAdded = (filePath) => {
    this.changes[filePath] = this.ChangeAction.Save;
    return this.debounce();
  };

  onDirAdded = () => {};

  onChanged = (filePath) => {
    this.changes[filePath] = this.ChangeAction.Save;
    return this.debounce();
  };

  onUnlinked = (filePath) => {
    this.changes[filePath] = this.ChangeAction.Remove;
    return this.debounce();
  };

  onDirUnlinked = (filePath) => {
    this.changes[filePath] = this.ChangeAction.Remove;
    return this.debounce();
  };

  debounce = (resync) => {
    let thisBatch = ++this.lastBatch;
    return setTimeout(() => {
      return this.trySendBatch(thisBatch, resync);
    }, 200);
  };

  getChanges = (batch) => {
    let buildSourceChanges = (sourceChanges) => {
      let root = path.resolve('');
      let data, i, item, len;

      for (i = 0, len = sourceChanges.length; i < len; i++) {
        item = sourceChanges[i];
        if (item.action === this.ChangeAction.Save) {
          try {
            data = fs.readFileSync(item.path);
            item.content = data.toString('base64');
            item.encoding = 'base64';
          } catch (err) {
            item.action = this.ChangeAction.Remove;
          }
        }
        item.path = item.path.substring(root.length + 1).replace(/\\/g, '/');
      }
      return sourceChanges.filter((item) => {
        return item.action === this.ChangeAction.Save ||
               item.action === this.ChangeAction.Remove;
      });
    };

    let buildMigrateChanges = (batch) => {
      return buildSetUpChanges(this).then((setUpChanges) => {
        return buildSourceChanges(filterSourceChanges(batch)).concat(setUpChanges);
      });
    };

    return this.isMigrateSet ? buildMigrateChanges(batch) : buildSourceChanges(batch);
  };

  trySendBatch = (thisBatch, resync) => {
    if (thisBatch !== this.lastBatch) return;

    let batch = [];
    for (let filePath in this.changes) {
      let action = this.changes[filePath];
      if (action) {
        batch.push({
          action: action,
          path: filePath
        });
      }
    }

    this.changes = {};
    this.lastBatch = 0;

    return Q.all([this.getChanges(batch)]).spread((batchChanges) => {
      let refresh = resync ? false : true;
      return this.sendChanges(batchChanges, refresh);
    }).done();
  };

  sendChanges = (batchChanges, refresh) => {

    const galleryObj = {
      account: this.credentials.account,
      state: this.workspace,
      changes: batchChanges
    };

    let options = {
      url: this.endpoint + '/' + this.vendor + '/sandboxes/' + this.sandbox + '/' + this.app + '/files',
      method: 'POST',
      json: galleryObj,
      headers: {
        Authorization: 'token ' + this.credentials.token,
        Accept: this.acceptHeader,
        'Content-Type': 'application/json',
        'x-vtex-accept-snapshot': false
      }
    };

    if (refresh) options.url += '?resync=true';

    if (refresh) {
      console.log('Synchronizing...'.blue);
    } else {
      console.log('Changes detected, uploading...'.blue);
    }

    return request(options, (error, response) => {
      if (error || response.statusCode !== 200 || response.statusCode >= 400) {
        return this.changeSendError(error, response);
      }
      return this.changesSentSuccessfuly(response.body);
    });
  };

  changesSentSuccessfuly = (batchChanges) => {
    this.logResponse(batchChanges);
    let paths = batchChanges.map(function(change) {
      return change.path;
    });

    let linkMsg = 'Your URL: '.green;

    if (paths.length > 0) {
      console.log('\n... files uploaded\n'.green);
    } else {
      console.log('\nEverything is up to date\n'.green);
    }

    if (this.isServerSet === 'true') {
      linkMsg += ('http://' + this.credentials.account + '.local.myvtex.com:3000/').blue.underline;
    } else {
      linkMsg += ('http://' + this.credentials.account + '.beta.myvtex.com/').blue.underline;
    }

    linkMsg += ('?workspace=sb_' + this.sandbox + '\n').blue.underline;
    console.log(linkMsg);

    let options = {
      url: 'http://localhost:35729/changed',
      method: 'POST',
      json: {
        files: paths
      }
    };
    request(options, (error, response) => {
      if (error || response.statusCode !== 200) {
        return this.changeSendError(error, response);
      }
    });
  };

  logResponse = (batchChanges) => {
    let results = [];

    batchChanges.forEach((change) => {
      if (change.action === 'save') {
        console.log('U'.yellow + (' ' + change.path));
      } else if (change.action === 'remove') {
        console.log('D'.red + (' ' + change.path));
      } else {
        console.log(change.action.grey + ' ' + change.path);
      }

      if (change.warnings) {
        change.warnings.forEach((warning) => {
          results.push(console.log('  ' + warning.yellow));
        });
      } else {
        results.push(void 0);
      }
    });

    return results;
  };

  changeSendError = (error, response) => {
    console.error('Error sending files'.red);
    if (error) console.error(error);

    if (response) {
      console.error('Status:', response.statusCode);
      console.error('Headers:', response.headers);
      return console.error('Body:', response.body);
    }
  };

  getFilesChanges = (files) => {
    let sourceFiles = filterSourceFiles(files);
    let filterSandboxFiles = (sandboxFiles) => {
      let filesToCompare = {};
      Object.keys(sandboxFiles).forEach((file) => {
        if (!isRouteFile(file) && !isAreaFile(file) && !isComponentFile(file)) {
            filesToCompare[file] = sandboxFiles[file];
        }
      });
      return filesToCompare;
    };

    return Q.all([generateFilesHash(sourceFiles), getSandboxFiles(this)])
      .spread((localFiles, sandboxFiles) => {
        let remoteFiles = this.isMigrateSet ? filterSandboxFiles(sandboxFiles) : sandboxFiles;
        return sandboxFiles != null
          ? passToChanges(remoteFiles, localFiles)
          : passToChanges(localFiles);
      });
  };

  lrRun = (port) => {
    let testPort = net.createServer();

    testPort
      .once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          return this.lrPortInUse = true;
        }
      })
      .once('listening', () => {
        testPort.close();
        this.lr = tinylr();
        return this.lr.listen(port);
      })
      .listen(port);

    return testPort;
  };

  activateSandbox = () => {
    let deferred = Q.defer();
    let options = {
      url: (this.endpoint + '/' + this.credentials.account + '/workspaces/' + this.workspace + '/') + ('sandboxes/' + this.vendor + '/' + this.credentials.email + '/apps/' + this.app),
      method: 'PUT',
      headers: {
        Authorization: 'token ' + this.credentials.token,
        Accept: this.acceptHeader,
        'Content-Type': 'application/json'
      }
    };

    request(options, (error, response) => {
      if (error || response.statusCode !== 200) {
        return deferred.reject(error || response.body.message);
      }

      return deferred.resolve();
    });

    setTimeout(this.activateSandbox, 30000);
    return deferred.promise;
  };

  deactivateSandbox = () => {
    let options = {
      url: (this.endpoint + '/' + this.credentials.account + '/workspaces/' + this.workspace + '/') + ('sandboxes/' + this.vendor + '/' + this.credentials.email + '/apps/' + this.app),
      method: 'DELETE',
      headers: {
        Authorization: 'token ' + this.credentials.token,
        Accept: this.acceptHeader,
        'Content-Type': 'application/json'
      }
    };

    return request(options, function(error, response) {
      if (error || response.statusCode !== 204) {
        console.log(error || response.body.message);
      }
      return process.exit(1);
    });
  };
}
