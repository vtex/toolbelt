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
  const errorMsg = JSON.parse(error.body).message || error;
  console.error('\nFailed to publish app'.red);
  console.error(errorMsg.bold.red);

  process.exit(1);
}

Q.all([getValidCredentials(), getAppMetadata()])
.spread(publishApp)
.then(showSuccessMessage)
.catch(handleError);
