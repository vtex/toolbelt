import Q from 'q';
import path from 'path';
import fs from 'fs';
import request from 'requestretry';
import chokidar from 'chokidar';
import { listFiles } from './file-manager';
import tinylr from 'tiny-lr';
import crypto from 'crypto';
import net from 'net';
import chalk from 'chalk';
import ora from 'ora';

class Watcher {
  constructor(app, version, vendor, credentials, isServerSet) {
    this.ChangeAction = {
      Save: 'save',
      Remove: 'remove'
    };
    this.changes = {};
    this.lastBatch = 0;
    this.lrPortInUse = false;

    this.app = app;
    this.version = version;
    this.vendor = vendor;
    this.credentials = credentials;
    this.isServerSet = isServerSet;

    this.appsEndpoint = 'http://apps.vtex.com';
    this.workspacesEndpoint = 'http://workspaces.vtex.com';
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
  }

  watch = () => {
    let ref;
    let root = process.cwd();
    let usePolling = (ref = process.platform === 'win32') != null ? ref : false;
    this.activateSandbox();

    return listFiles().then((result) => {
      let deferred = Q.defer();

      if (result.appsEndpoint) this.appsEndpoint = result.appsEndpoint;
      if (result.workspacesEndpoint) this.workspacesEndpoint = result.workspacesEndpoint;
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
            deferred.resolve();
          });
        });

      return deferred.promise;
    });
  }

  onAdded = (filePath) => {
    this.changes[filePath] = this.ChangeAction.Save;
    return this.debounce();
  }

  onDirAdded = () => {}

  onChanged = (filePath) => {
    this.changes[filePath] = this.ChangeAction.Save;
    return this.debounce();
  }

  onUnlinked = (filePath) => {
    this.changes[filePath] = this.ChangeAction.Remove;
    return this.debounce();
  }

  onDirUnlinked = (filePath) => {
    this.changes[filePath] = this.ChangeAction.Remove;
    return this.debounce();
  }

  debounce = (resync) => {
    let thisBatch = ++this.lastBatch;
    return setTimeout(() => {
      return this.trySendBatch(thisBatch, resync);
    }, 200);
  }

  getChanges = (batch) => {
    let data, i, item, len;
    let root = path.resolve('');

    for (i = 0, len = batch.length; i < len; i++) {
      item = batch[i];
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

    return batch.filter((item) => {
      return item.action === this.ChangeAction.Save || item.action === this.ChangeAction.Remove;
    });
  }

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
    let batchChanges = this.getChanges(batch);
    let refresh = resync ? false : true;

    return this.sendChanges(batchChanges, refresh);
  }

  sendChanges = (batchChanges, refresh) => {
    let spinner;
    const galleryObj = {
      account: this.credentials.account,
      workspace: this.workspace,
      changes: batchChanges
    };

    let options = {
      url: `${this.appsEndpoint}/${this.vendor}/sandboxes/${this.sandbox}/${this.app}/${this.version}/files`,
      method: 'POST',
      json: galleryObj,
      headers: {
        Authorization: `token ${this.credentials.token}`,
        Accept: this.acceptHeader,
        'Content-Type': 'application/json',
        'x-vtex-accept-snapshot': false
      }
    };

    if (refresh) options.url += '?resync=true';

    if (refresh) {
      spinner = ora(chalk.blue('Synchronizing...'));
    } else {
      spinner = ora(chalk.blue('Changes detected, uploading...'));
    }
    spinner.start();

    return request(options, (error, response) => {
      spinner.stop();

      if (error || response.statusCode !== 200 || response.statusCode >= 400) {
        return this.changeSendError(error, response);
      }

      return this.changesSentSuccessfuly(response.body);
    });
  }

  changesSentSuccessfuly = (batchChanges) => {
    this.logResponse(batchChanges);
    let paths = batchChanges.map(function(change) {
      return change.path;
    });

    let linkMsg = chalk.green('Your URL: ');

    if (paths.length > 0) {
      console.log(chalk.green('\n... files uploaded\n'));
    } else {
      console.log(chalk.green('\nEverything is up to date\n'));
    }

    if (this.isServerSet === 'true') {
      linkMsg += chalk.blue.underline('http://' + this.credentials.account + '.local.myvtex.com:3000/');
    } else {
      linkMsg += chalk.blue.underline('http://' + this.credentials.account + '.myvtex.com/');
    }

    linkMsg += chalk.blue.underline('?workspace=sb_' + this.sandbox + '\n');
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
  }

  logResponse = (batchChanges) => {
    let results = [];

    batchChanges.forEach((change) => {
      if (change.action === 'save') {
        console.log(chalk.yellow('U') + (' ' + change.path));
      } else if (change.action === 'remove') {
        console.log(chalk.red('D') + (' ' + change.path));
      } else {
        console.log(chalk.grey(change.action) + ' ' + change.path);
      }

      if (change.warnings) {
        change.warnings.forEach((warning) => {
          results.push(console.log('  ' + chalk.yellow(warning)));
        });
      } else {
        results.push(void 0);
      }
    });

    return results;
  }

  changeSendError = (error, response) => {
    console.error(chalk.red('Error sending files'));
    if (error) console.error(error);

    if (response) {
      console.error('Status:', response.statusCode);
      console.error('Headers:', response.headers);
      return console.error('Body:', response.body);
    }
  }

  getSandboxFiles = () => {
    let options = {
      url: `${this.appsEndpoint}/${this.vendor}/sandboxes/${this.sandbox}/${this.app}/${this.version}/files?list=true&_limit=1000`,
      method: 'GET',
      headers: {
        Authorization: `token ${this.credentials.token}`,
        Accept: this.acceptHeader,
        'Content-Type': 'application/json',
        'x-vtex-accept-snapshot': false
      }
    };

    return request(options).then((response) => {
      if (response.statusCode === 200) {
        return JSON.parse(response.body).data.reduce((acc, file) => {
          acc[file.path] = { hash: file.hash };
          return acc;
        }, {});
      } else if (response.statusCode === 404) {
        return void 0;
      }

      return console.error('Status:', response.statusCode);
    });
  }

  generateFilesHash = (files) => {
    let root = process.cwd();

    let readAndHash = (filePath) => {
      return Q.nfcall(fs.readFile, path.resolve(root, filePath)).then((content) => {
        let hashedContent = crypto.createHash('md5').update(content, 'binary').digest('hex');
        return {
          path: filePath,
          hash: hashedContent
        };
      });
    };

    let mapFiles = (filesArr) => {
      let filesAndHash = {};

      filesArr.forEach((file) => {
        filesAndHash[file.path] = {
          hash: file.hash
        };
      });

      return filesAndHash;
    };

    let filesPromise = [];
    files.forEach((file) => {
      filesPromise.push(readAndHash(file));
    });

    return Q.all(filesPromise).then(mapFiles);
  }

  getFilesChanges = (files) => {
    let passToChanges = (filesToLoop, filesToCompare) => {
      let changes = {};
      let filesToCompareExists = filesToCompare !== void 0;

      for (let file in filesToLoop) {
        if (!filesToCompareExists) {
          changes[file] = this.ChangeAction.Save;
        } else {
          if (filesToCompare[file] == null) {
            changes[file] = this.ChangeAction.Remove;
          } else {
            let hashCompare = filesToCompare[file].hash !== filesToLoop[file].hash;
            delete filesToCompare[file];
            if (hashCompare) {
              changes[file] = this.ChangeAction.Save;
            }
          }
        }
      }

      let compareKeys;
      if (!!filesToCompareExists) {
        compareKeys = Object.keys(filesToCompare).length;
      }

      if (compareKeys > 0) {
        for (let file in filesToCompare) {
          changes[file] = this.ChangeAction.Save;
        }
      }

      return changes;
    };

    return Q.all([this.generateFilesHash(files), this.getSandboxFiles()])
    .spread((localFiles, sandboxFiles) => {
      if (sandboxFiles != null) {
        return passToChanges(sandboxFiles, localFiles);
      }
      return passToChanges(localFiles);
    });
  }

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
  }

  activateSandbox = () => {
    let deferred = Q.defer();
    let options = {
      url: `${this.appsEndpoint}/${this.credentials.account}/workspaces/${this.workspace}/sandboxes/${this.vendor}/${this.sandbox}/${this.app}/${this.version}`,
      method: 'PUT',
      headers: {
        Authorization: `token ${this.credentials.token}`,
        Accept: this.acceptHeader,
        'Content-Type': 'application/json'
      },
      json: { ttl: 35 }
    };

    request(options, (error, response) => {
      if (error || response.statusCode !== 200) {
        return deferred.reject(error || response.body.message);
      }

      return deferred.resolve();
    });

    setTimeout(this.activateSandbox, 30000);
    return deferred.promise;
  }

  deactivateSandbox = () => {
    let options = {
      url: `${this.appsEndpoint}/${this.credentials.account}/workspaces/${this.workspace}/sandboxes/${this.vendor}/${this.sandbox}/${this.app}/${this.version}`,
      method: 'DELETE',
      headers: {
        Authorization: `token ${this.credentials.token}`,
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
  }
}

export default Watcher;
