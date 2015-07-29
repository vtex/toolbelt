Q = require 'q'
auth = require './lib/auth'
Watcher = require './lib/watch'
metadata = require './lib/meta'
chalk = require 'chalk'
vtexsay = require 'vtexsay'

if not process.argv[process.argv.length - 1].match(/^[\w_-]+$/)
  throw Error 'Sandbox may contain only letters, numbers, underscores and hyphens'.red

promise = Q.all([
  auth.getValidCredentials()
  metadata.getAppMetadata()
]).spread((credentials, meta) ->
  name = meta.name
  vendor = meta.vendor

  watcher = new Watcher(name, vendor, process.argv[process.argv.length - 1], credentials)
  watcher.watch()
).then((app) ->
  console.log vtexsay("Welcome to the VTEX Toolbelt!"), chalk.green("\n\nWatching "+chalk.italic(app.app)+"\n")
).catch((error) ->
  console.error "\nFailed to start watch".red
  console.error error
)

module.exports = promise

