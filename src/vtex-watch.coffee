Q = require 'q'
auth = require './lib/auth'
Watcher = require './lib/watch'
metadata = require './lib/meta'
chalk = require 'chalk'
vtexsay = require 'vtexsay'

SANDBOX_INDEX = process.argv.length - 1
sandbox = process.argv[SANDBOX_INDEX]

unless sandbox.match(/^[\w_-]+$/)
  throw Error 'Sandbox may contain only letters, numbers, underscores and hyphens'.red

promise = Q.all([
  auth.getValidCredentials()
  metadata.getAppMetadata()
]).spread((credentials, meta) ->
  name = meta.name
  vendor = meta.vendor

  watcher = new Watcher(name, vendor, sandbox, credentials)
  watcher.watch()
).then((app) ->
  console.log vtexsay("Welcome to the VTEX Toolbelt!"), chalk.green("\n\nWatching "+chalk.italic(app.app)+"\n")
).catch((error) ->
  console.error "\nFailed to start watch".red
  if error.code is 'ENOTFOUND'
    console.log "Address #{error.hostname} not found".red +
                '\nAre you online?'.yellow
  else
    console.log error
  process.exit()
)

module.exports = promise

