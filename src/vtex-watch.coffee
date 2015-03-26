program = require 'commander'
pkg = require '../package.json'
auth = require './lib/auth'
Watcher = require './lib/watch'
metadata = require './lib/meta'

program.version(pkg.version).parse process.argv

auth.getValidCredentials().then((credentials) ->

  throw Error "Sandbox name is required. Use vtex watch <sandbox>".red unless program.args.length
  throw Error 'Sandbox may contain only letters, numbers, underscores and hyphens'.red if !(program.args[0].match(/^[\w_-]+$/))

  metadata.getAppMetadata()
  .then((meta) ->
    watcher = new Watcher(meta.name, meta.owner, program.args[0], credentials)
    watcher.watch()
  )
).catch((error) => console.log error.message)