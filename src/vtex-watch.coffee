Q = require 'q'
program = require 'commander'
pkg = require '../package.json'
auth = require './lib/auth'
Watcher = require './lib/watch'
metadata = require './lib/meta'
chalk = require 'chalk'
vtexsay = require 'vtexsay'
webpack = require 'webpack'

program.version(pkg.version).parse process.argv
unless program.args.length
  throw Error "Sandbox name is required. Use vtex watch <sandbox>".red

unless program.args[0].match(/^[\w_-]+$/)
  throw Error 'Sandbox may contain only letters, numbers, underscores and hyphens'.red

Q.all([
  auth.getValidCredentials()
  metadata.getAppMetadata()
]).spread((credentials, meta) ->
  name = meta.name
  vendor = meta.vendor

  if program.rawArgs[program.rawArgs.length - 1] is '-w'
    config = require process.cwd() + '/webpack.config.js'
    webpack(config).watch({}, ->)

  watcher = new Watcher(name, vendor, program.args[0], credentials)
  watcher.watch()
).then((app) ->
  console.log vtexsay("Welcome to the VTEX Toolbelt!"), chalk.green("\n\nWatching "+chalk.italic(app.app))
).catch((error) ->
  console.error "\nFailed to start watch".red
  console.error error
)
