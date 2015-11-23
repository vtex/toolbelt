#!/usr/bin/env node

import Q from 'q';
import { getAppMetadata } from '../lib/meta';
import publish from '../lib/publish';
import { getValidCredentials } from '../lib/auth';
import chalk from 'chalk';

function publishApp(credentials, meta) {
  const { name, vendor, version } = meta;
  return publish(name, version, vendor, credentials);
}

function showSuccessMessage(app) {
  return console.log(chalk.green('\nApp ' + chalk.italic(app.app) + ' version ' + chalk.bold(app.version) + ' was successfully published!'));
}

function handleError(error) {
  console.error('\nFailed to publish app\n'.bold.red);

  const errorObj = JSON.parse(error.body);
  if (errorObj.message) {
    console.error('Error: ' + errorObj.message);
  } else {
    console.error('Error:' + error);
  }
  if (errorObj.details) {
    console.error('Details:');
    console.error(JSON.stringify(errorObj.details, null, 2));
  }

  process.exit(1);
}

Q.all([getValidCredentials(), getAppMetadata()])
.spread(publishApp)
.then(showSuccessMessage)
.catch(handleError);
