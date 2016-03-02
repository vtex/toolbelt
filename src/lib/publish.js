import Q from 'q';
import request from 'request';
import fs from 'fs';
import { compressFiles, getRequestConfig, getZipFilePath, removeZipFile } from './file-manager';
import chalk from 'chalk';

function pushApp(app, version, vendor, credentials) {
  console.log(chalk.grey('Compressing files...'));

  return compressFiles(app, version).then(() => {
    return getRequestConfig().then((config) => {
      let deferred = Q.defer();

      const url = config.AppsEndpoint || 'http://apps.beta.vtex.com';
      const acceptHeader = config.AcceptHeader || 'application/vnd.vtex.gallery.v0+json';
      let formData = {
        attachments: [fs.createReadStream(getZipFilePath(app, version))]
      };
      let options = {
        url: url + '/' + vendor + '/apps',
        method: 'POST',
        formData: formData,
        headers: {
          Authorization: 'token ' + credentials.token,
          'Accept': acceptHeader,
          'x-vtex-accept-snapshot': false
        }
      };

      console.log(chalk.grey('Sending files...'));
      request(options, (error, response) => {
        if (error) return deferred.reject(error);

        removeZipFile(app, version);

        if (response.statusCode === 200 || response.statusCode === 201) {
          deferred.resolve({
            app: app,
            version: version
          });
        }

        deferred.reject({
          status: response.statusCode,
          body: response.body
        });
      });

      return deferred.promise;
    });
  });
}

export default function publish(app, version, vendor, credentials) {
  console.log('Publishing', '' + app, '' + version);
  return pushApp(app, version, vendor, credentials);
}
