Q = require 'q'
auth = require './lib/auth'
Watcher = require './lib/watch'
metadata = require './lib/meta'
WebpackRunner = require './lib/webpack'
chalk = require 'chalk'
vtexsay = require 'vtexsay'

SERVER_INDEX = process.argv.length - 1
WEBPACK_INDEX = process.argv.length - 2

serverFlag = process.argv[SERVER_INDEX]
webpackFlag = process.argv[WEBPACK_INDEX]
isFlagActive = webpackFlag is 'true' or serverFlag is 'true'

Q.all [auth.getValidCredentials(), metadata.getAppMetadata()]
.spread (credentials, meta) ->
  name = meta.name
  vendor = meta.vendor

  watcher = new Watcher name, vendor, credentials, serverFlag
  watcher.watch()
.then (app) ->
  console.log vtexsay("Welcome to the VTEX Toolbelt!"),
              chalk.green("\n\nWatching " + chalk.italic(app.app) + "\n")
.then () ->
  if isFlagActive
    webpackRunner = new WebpackRunner()

    if webpackFlag is 'true'
      webpackRunner.startWebpack()
    else if serverFlag is 'true'
      webpackRunner.startDevServer()
.catch (error) ->
  console.error "\nFailed to start watch".red

  if error.code is 'ENOTFOUND'
    console.log "Address #{error.hostname} not found".red +
                '\nAre you online?'.yellow
  else
    console.log error

  process.exit 1

