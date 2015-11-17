import Q from 'q';
import request from 'request';
import fs from 'fs';
import fileManager from './file-manager';

function pushApp(app, version, vendor, credentials) {
  console.log('Compressing files...'.grey);

  return fileManager.compressFiles(app, version).then(() => {
    return fileManager.getRequestConfig().then((config) => {
      let deferred = Q.defer();

      const url = config.GalleryEndpoint || 'http://api.beta.vtex.com';
      const acceptHeader = config.AcceptHeader || 'application/vnd.vtex.gallery.v0+json';
      let formData = {
        attachments: [fs.createReadStream(fileManager.getZipFilePath(app, version))]
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

      console.log('Sending files...'.grey);
      request(options, (error, response) => {
        if (error) return deferred.reject(error);

        fileManager.removeZipFile(app, version);

        let statusCode = response.statusCode;
        if (statusCode === 200 || statusCode === 201) {
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
