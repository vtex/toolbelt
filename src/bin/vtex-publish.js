#!/usr/bin/env node

import Q from 'q';
import { getAppMetadata } from '../lib/meta';
import publish from '../lib/publish';
import auth from '../lib/auth';
import chalk from 'chalk';

Q.all([auth.getValidCredentials(), getAppMetadata()])
.spread((credentials, meta) => {
  const { name, vendor, version } = meta;
  return publish(name, version, vendor, credentials);
}).then((app) => {
  return console.log(chalk.green('\nApp ' + chalk.italic(app.app) + ' version ' + chalk.bold(app.version) + ' was successfully published!'));
}).catch((error) => {
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
});
