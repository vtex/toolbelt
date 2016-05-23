#!/usr/bin/env node

import readline from 'readline';
import Q from 'q';
import { getValidCredentials } from '../lib/auth';
import Watcher from '../lib/watch';
import { getAppMetadata } from '../lib/meta';
import WebpackRunner from '../lib/webpack';
import chalk from 'chalk';
import vtexsay from 'vtexsay';

let watcher;
let webpack;

const SERVER_INDEX = process.argv.length - 1;
const WEBPACK_INDEX = process.argv.length - 2;
const DELAY_TIME = 2000;

const serverFlag = process.argv[SERVER_INDEX];
const webpackFlag = process.argv[WEBPACK_INDEX];
const isFlagActive = webpackFlag === 'true' || serverFlag === 'true';

function runWatcher(credentials, manifest) {
  const { name, version, vendor } = manifest;

  const watcher = new Watcher(name, version, vendor, credentials, serverFlag);
  watcher.watch();

  return watcher;
}

function showWelcomeMessage(app) {
  console.log(vtexsay('Welcome to the VTEX Toolbelt!'),
              chalk.green(`\n\nWatching ${chalk.italic(app)} \n`));
}

function runWebpack(credentials, manifest) {
  if (isFlagActive) {
    let webpackRunner = new WebpackRunner(manifest.vendor, credentials);
    if (webpackFlag === 'true') {
      webpackRunner.startWebpack();
    } else if (serverFlag === 'true') {
      webpackRunner.startDevServer();
    }

    return webpackRunner;
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
  watcher = runWatcher(credentials, manifest);
  return { credentials, manifest };
})
.then(({ credentials, manifest }) => {
  showWelcomeMessage(manifest.name);
  return { credentials, manifest };
})
.then(({ credentials, manifest }) => {
  setTimeout(() => {
    webpack = runWebpack(credentials, manifest);
  }, DELAY_TIME);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.on('SIGINT', () => {
    if (watcher.spinner) watcher.spinner.stop();
    if (webpack) webpack.close();

    console.log(chalk.green('\nDeactivating sandbox...'));

    watcher.deactivateSandbox()
    .then(() => process.exit())
    .catch(err => {
      console.log(err);
      process.exit(1);
    });
  });
})
.catch(handleError);
