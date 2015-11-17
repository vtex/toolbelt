#!/usr/bin/env node

import Q from 'q';
import auth from '../lib/auth';
import Watcher from '../lib/watch';
import { getAppMetadata } from '../lib/meta';
import WebpackRunner from '../lib/webpack';
import chalk from 'chalk';
import vtexsay from 'vtexsay';

const SERVER_INDEX = process.argv.length - 1;
const WEBPACK_INDEX = process.argv.length - 2;

const serverFlag = process.argv[SERVER_INDEX];
const webpackFlag = process.argv[WEBPACK_INDEX];
const isFlagActive = webpackFlag === 'true' || serverFlag === 'true';

Q.all([auth.getValidCredentials(), getAppMetadata()])
.spread((credentials, meta) => {
  const { name, vendor } = meta;

  const watcher = new Watcher(name, vendor, credentials, serverFlag);
  return watcher.watch();
}).then((app) => {
  console.log(vtexsay('Welcome to the VTEX Toolbelt!'),
              chalk.green(`\n\nWatching ${chalk.italic(app.app)} \n`));
}).then(() => {
  if (isFlagActive) {
    let webpackRunner = new WebpackRunner();
    if (webpackFlag === 'true') {
      return webpackRunner.startWebpack();
    } else if (serverFlag === 'true') {
      return webpackRunner.startDevServer();
    }
  }
}).catch((error) => {
  console.error('\nFailed to start watch'.red);
  if (error.code === 'ENOTFOUND') {
    console.log((`Address ${error.hostname} not found`).red + '\nAre you online?'.yellow);
  } else {
    console.log(error);
  }
  return process.exit(1);
});
