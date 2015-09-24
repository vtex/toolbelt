Q = require 'q'
auth = require './lib/auth'
Watcher = require './lib/watch'
metadata = require './lib/meta'
webpackOption = require './lib/webpack'
chalk = require 'chalk'
vtexsay = require 'vtexsay'

SANDBOX_INDEX = process.argv.length - 1
SERVER_INDEX = process.argv.length - 2
WEBPACK_INDEX = process.argv.length - 3

sandbox = process.argv[SANDBOX_INDEX]
serverFlag = process.argv[SERVER_INDEX]
webpackFlag = process.argv[WEBPACK_INDEX]

unless sandbox.match /^[\w_-]+$/
  throw Error 'Sandbox may contain only letters, numbers, underscores and hyphens'.red

promise = Q.all [auth.getValidCredentials(), metadata.getAppMetadata()]
.spread (credentials, meta) ->
  name = meta.name
  vendor = meta.vendor

  watcher = new Watcher name, vendor, sandbox, credentials
  watcher.watch()
.then (app) ->
  console.log vtexsay("Welcome to the VTEX Toolbelt!"),
              chalk.green("\n\nWatching " + chalk.italic(app.app) + "\n")
.then () ->
  if webpackFlag is 'true'
    webpackOption.startWebpack()
  else if serverFlag is 'true'
    webpackOption.startDevServer()
.catch (error) ->
  console.error "\nFailed to start watch".red

  if error.code is 'ENOTFOUND'
    console.log "Address #{error.hostname} not found".red +
                '\nAre you online?'.yellow
  else
    console.log error

  process.exit 1

