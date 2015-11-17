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
  const errorMsg = JSON.parse(error.body).message || error;
  console.error('\nFailed to publish app'.red);
  console.error(errorMsg.bold.red);
});
