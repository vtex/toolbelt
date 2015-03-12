`#!/usr/bin/env node`
program = require('commander')
pkg = require('../package.json')
auth = require('./lib/auth')
Q = require 'Q'

program.version(pkg.version).parse process.argv

auth.login().then((data) ->
    console.log "Logged in as #{data.email}"
  ).catch (error) =>
    console.log error