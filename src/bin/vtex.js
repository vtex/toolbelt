#!/usr/bin/env node

import { docopt } from 'docopt';
import pkg from '../package.json';
import { spawn } from 'child_process';
import path from 'path';

const doc = `
  Usage:
    vtex login
    vtex logout
    vtex publish
    vtex watch [--webpack | --server] [--changes]
    vtex --help
    vtex --version

  Commands:
    login         Log in with your VTEX credentials
    logout        Clear local authentication credentials
    publish       Publish this app to VTEX Gallery
    watch         Start a development sandbox

  Options:
    -h --help     Show this screen
    -v --version  Show version
    -w --webpack  Start with webpack
    -s --server   Start with dev server
    -c --changes  Start with changes mode

`;

const options = docopt(doc, { version: pkg.version });

function run(command, argv = [], env = '') {
  const baseDir = path.dirname(process.argv[1]);
  let args = [baseDir + '/' + command];

  argv.forEach((arg) => {
    args.push(arg);
  });

  let childEnv = Object.create(process.env);
  if (env !== '') {
    childEnv[env] = 'true';
  }

  let proc, spawnOpts;
  if (process.platform !== 'win32') {
    spawnOpts = {
      stdio: 'inherit',
      customFds: [0, 1, 2],
      env: childEnv
    };
    proc = spawn('node', args, spawnOpts);
  } else {
    spawnOpts = {
      stdio: 'inherit',
      env: childEnv
    };
    proc = spawn(process.execPath, args, spawnOpts);
  }
  proc.on('close', process.exit.bind(process));

  return proc.on('error', (err) => {
    if (err.code === 'ENOENT') {
      console.error('\n %s(1) does not exist, try --help\n', bin);
    } else if (err.code === 'EACCES') {
      console.error('\n %s(1) not executable. try chmod or run with root\n', bin);
    }
    return process.exit(1);
  });
}

let command, argv, env;
if (options.login) {
  command = 'vtex-login';
} else if (options.logout) {
  command = 'vtex-logout';
} else if (options.publish) {
  command = 'vtex-publish';
} else {
  command = 'vtex-watch';
  if (options['--server']) {
    env = 'HOT';
  }
  argv = [options['--webpack'], options['--server'], options['--changes']];
}

run(command, argv, env);
