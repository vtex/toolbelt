program = require 'commander'
pkg = require '../package.json'
auth = require './lib/auth'
Watcher = require './lib/watch'
metadata = require './lib/meta'

program.version(pkg.version).parse process.argv

auth.getValidCredentials().then((credentials) ->
  sandbox = if program.args.length then program.args[0] else credentials.email

  metadata.getAppMetadata()
  .then((meta) ->
    watcher = new Watcher(meta.name, meta.owner, sandbox, credentials)
    watcher.watch()
  )
).catch((error) => console.log error.message)