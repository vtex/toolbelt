Q = require 'q'
program = require 'commander'
pkg = require '../package.json'
auth = require './lib/auth'
Watcher = require './lib/watch'
metadata = require './lib/meta'
chalk = require 'chalk'
vtexsay = require 'vtexsay'

program.version(pkg.version).parse process.argv
unless program.args.length
  throw Error "Sandbox name is required. Use vtex watch <sandbox>".red

unless program.args[0].match(/^[\w_-]+$/)
  throw Error 'Sandbox may contain only letters, numbers, underscores and hyphens'.red

promise = Q.all([
  auth.getValidCredentials()
  metadata.getAppMetadata()
]).spread((credentials, meta) ->
  name = meta.name
  vendor = meta.vendor

  watcher = new Watcher(name, vendor, program.args[0], credentials)
  watcher.watch()
).then((app) ->
  console.log vtexsay("Welcome to the VTEX Toolbelt!"), chalk.green("\n\nWatching "+chalk.italic(app.app)+"\n")
).catch((error) ->
  console.error "\nFailed to start watch".red
  console.error error
)

module.exports = promise
