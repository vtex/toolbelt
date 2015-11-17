import 'shelljs/global';
import path from 'path';
import Q from 'q';
import glob from 'glob';
import fs from 'fs';
import archiver from 'archiver';

class FileManager {
  constructor() {
    this.temporaryZipFolder = path.resolve(module.filename, '../../temporary');
  }

  listFiles = () => {
    let deferred = Q.defer();

    Q.all([this.getIgnoredPatterns(), this.getRequestConfig()])
    .spread((ignoredPatterns, requestConfig) => {
      ignoredPatterns.push('**/.*', '**/*__', '**/*~');
      glob('**', { nodir: true, ignore: ignoredPatterns}, (er, files) => {
        deferred.resolve({
          files: files,
          ignore: ignoredPatterns,
          endpoint: requestConfig.GalleryEndpoint,
          header: requestConfig.AcceptHeader
        });
      });
    });

    return deferred.promise;
  }

  getIgnoredPatterns = () => {
    return this.readVtexIgnore().then((vtexIgnore) => {
      let lines = vtexIgnore.match(/[^\r\n]+/g);
      let ignored = lines.filter((line) => {
        return line.charAt(0) !== '#' && line !== '';
      });
      return ignored.map((item) => {
        if (item.substr(-1) === '/') {
          return item += '**';
        }
        return item;
      });
    }).catch(function() {
      return [];
    });
  }

  getRequestConfig = () => {
    return this.readVtexRc().then((vtexRc) => {
      let lines = vtexRc.match(/[^\r\n]+/g);
      let config = lines.filter(function(line) {
        return line.charAt(0) !== '#' && line !== '';
      });

      let configObj = {};
      config.forEach((prop) => {
        let confKey = /^(\w*)=?/.exec(prop)[1];
        let confVal = /'(.*)'/.exec(prop)[1].replace(/\/$/, '');
        configObj[confKey] = confVal;
      });

      return configObj;
    }).catch(() => {
      return [];
    });
  }

  readVtexIgnore() {
    let ignoreFile = function(file) {
      return path.resolve(process.cwd(), file);
    };

    let readIgnore = function(ignore) {
      return Q.nfcall(fs.readFile, ignore, 'utf8');
    };

    let file = readIgnore(ignoreFile('.vtexignore')).catch(() => {
      return readIgnore(ignoreFile('.gitignore'));
    });

    return file;
  }

  readVtexRc() {
    let vtexRc = path.resolve(process.cwd(), '.vtexrc');
    let file = Q.nfcall(fs.readFile, vtexRc, 'utf8');
    return file;
  }

  compressFiles = (app, version) => {
    return this.listFiles().then((result) => {
      let zipPath = this.getZipFilePath(app, version);

      if (!test('-e', this.temporaryZipFolder)) {
        mkdir('-p', this.temporaryZipFolder);
      }

      let deferred = Q.defer();
      let archive = archiver('zip');
      let output = fs.createWriteStream(zipPath);
      archive.pipe(output);

      result.files.forEach((file) => {
        archive.append(fs.createReadStream(path.resolve(process.cwd(), file)), {
          name: file
        });
      });
      archive.finalize();

      output.on('close', () => {
        console.log('\n', archive.pointer() + ' total bytes. Publishing...');
        return deferred.resolve(archive.pointer());
      });

      archive.on('error', (err) => deferred.reject(err));

      return deferred.promise;
    });
  }

  getZipFilePath(app, version) {
    return path.resolve(module.filename, '../../temporary/' + app + '-' + version + '.zip');
  }

  removeZipFile(app, version) {
    return rm('-rf', this.getZipFilePath(app, version));
  }
}

let fileManager = new FileManager();

export default {
  listFiles: fileManager.listFiles,
  getZipFilePath: fileManager.getZipFilePath,
  compressFiles: fileManager.compressFiles,
  removeZipFile: fileManager.removeZipFile,
  getRequestConfig: fileManager.getRequestConfig
};
