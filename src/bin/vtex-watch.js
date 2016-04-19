#!/usr/bin/env node

import Q from 'q';
import { getValidCredentials } from '../lib/auth';
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

function runWatcher(credentials, manifest) {
  const { name, vendor } = manifest;

  const watcher = new Watcher(name, vendor, credentials, serverFlag);
  return watcher.watch();
}

function showWelcomeMessage(app) {
  console.log(vtexsay('Welcome to the VTEX Toolbelt!'),
              chalk.green(`\n\nWatching ${chalk.italic(app)} \n`));
}

function runWebpack(credentials, manifest) {
  if (isFlagActive) {
    let webpackRunner = new WebpackRunner(manifest.vendor, credentials);
    if (webpackFlag === 'true') {
      return webpackRunner.startWebpack();
    } else if (serverFlag === 'true') {
      return webpackRunner.startDevServer();
    }
  }
}

function handleError(error) {
  console.error(chalk.red('\nFailed to start watch'));
  if (error.code === 'ENOTFOUND') {
    console.log(chalk.red(`Address ${error.hostname} not found`) + chalk.yellow('\nAre you online?'));
  } else {
    console.log(error);
  }
  return process.exit(1);
}

Q.all([getValidCredentials(), getAppMetadata()])
.spread((credentials, manifest) => {
  runWatcher(credentials, manifest);
  return { credentials, manifest};
})
.then(({ credentials, manifest }) => {
  showWelcomeMessage(manifest.name);
  return { credentials, manifest };
})
.then(({ credentials, manifest }) => {
  return runWebpack(credentials, manifest);
})
.catch(handleError);
