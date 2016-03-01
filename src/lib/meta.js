import path from 'path';
import fs from 'fs';
import Q from 'q';
import chalk from 'chalk';

function readAppMetadata() {
  const metaPath = path.resolve(process.cwd(), 'meta.json');
  const meta = Q.nfcall(fs.readFile, metaPath, 'utf8')['catch'](function() {
    throw new Error('Couldn\'t find meta.json file.');
  });
  return meta;
}

function validateMetadata(meta) {
  if (meta['name'] == null) {
    throw new Error('Field \'name\' should be set in meta.json file');
  }
  if (meta['version'] == null) {
    throw new Error('Field \'version\' should be set in meta.json file');
  }
  if (meta['vendor'] == null) {
    throw new Error('Field \'vendor\' should be set in meta.json file');
  }
  if (!meta['vendor'].match(/^[\w_-]+$/)) {
    throw new Error('Field \'vendor\' may contain only letters, numbers, underscores and hyphens');
  }
  if (!(meta['version'].match(/^(\d+)\.(\d+)\.(\d+)(-.*)?$/))) {
    throw Error('The version format is invalid');
  }
  return meta;
}

export function getAppMetadata() {
  return readAppMetadata()
    .then(JSON.parse)
    .then(validateMetadata)
    .catch(function(error) {
      throw new Error(chalk.red(error.message));
    });
}
