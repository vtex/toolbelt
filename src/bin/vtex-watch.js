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

function runWatcher(credentials, meta) {
  const { name, vendor } = meta;

  const watcher = new Watcher(name, vendor, credentials, serverFlag);
  return watcher.watch();
}

function showWelcomeMessage(app) {
  console.log(vtexsay('Welcome to pop VTEX Toolbelt!'),
              chalk.green(`\n\nWatching ${chalk.italic(app.app)} \n`));
}

function runWebpack() {
  if (isFlagActive) {
    let webpackRunner = new WebpackRunner();
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
.spread(runWatcher)
.then(showWelcomeMessage)
.then(() => {
  return runWebpack();
})
.catch(handleError);
