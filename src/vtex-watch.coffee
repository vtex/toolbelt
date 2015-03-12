`#!/usr/bin/env node`
program = require 'commander'
pkg = require '../package.json'
auth = require './lib/auth'
Watcher = require './lib/watch'
metadata = require './lib/meta'

program.version(pkg.version).parse process.argv

auth.getValidCredentials().then((credentials) ->
  throw new Error "Sandbox name is required. Use \'vtex watch <sandbox>\'" unless program.args.length

  metadata.getAppMetadata()
    .then((meta) ->
      watcher = new Watcher(meta.name, meta.owner, program.args[0], credentials)
      watcher.watch()
  )
).catch((error) => console.log error.message)