`#!/usr/bin/env node`
program = require 'commander'
pkg = require '../package.json'

program.version(pkg.version)
  .command('login', 'login to VTEX')
  .command('logout', 'logout')
  .command('publish', 'publish this app to VTEX Gallery')
  .command('watch [sandbox]', 'start a development sandbox')
  .parse process.argv
