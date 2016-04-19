import path from 'path';
import fs from 'fs';
import Q from 'q';
import chalk from 'chalk';

function readAppMetadata() {
  const manifestPath = path.resolve(process.cwd(), 'manifest.json');
  const manifest = Q.nfcall(fs.readFile, manifestPath, 'utf8')['catch'](function() {
    throw new Error('Couldn\'t find manifest.json file.');
  });
  return manifest;
}

function validateMetadata(manifest) {
  if (manifest['name'] == null) {
    throw new Error('Field \'name\' should be set in manifest.json file');
  }
  if (manifest['version'] == null) {
    throw new Error('Field \'version\' should be set in manifest.json file');
  }
  if (manifest['vendor'] == null) {
    throw new Error('Field \'vendor\' should be set in manifest.json file');
  }
  if (!manifest['vendor'].match(/^[\w_-]+$/)) {
    throw new Error('Field \'vendor\' may contain only letters, numbers, underscores and hyphens');
  }
  if (!(manifest['version'].match(/^(\d+)\.(\d+)\.(\d+)(-.*)?$/))) {
    throw Error('The version format is invalid');
  }
  return manifest;
}

export function getAppMetadata() {
  return readAppMetadata()
    .then(JSON.parse)
    .then(validateMetadata)
    .catch(function(error) {
      throw new Error(chalk.red(error.message));
    });
}
