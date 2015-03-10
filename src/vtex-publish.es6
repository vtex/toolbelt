#!/usr/bin/env node
let program = require('commander');
let pkg = require('../package.json');

program
  .version(pkg.version)
  .parse(process.argv);
