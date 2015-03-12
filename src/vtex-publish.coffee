`#!/usr/bin/env node`
program = require('commander')
pkg = require('../package.json')
program.version(pkg.version).parse process.argv
