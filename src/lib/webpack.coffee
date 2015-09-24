webpack = require 'webpack'
express = require 'express'
httpProxy = require 'http-proxy'
path = require 'path'
net = require 'net'
chalk = require 'chalk'

class WebpackOption
  constructor: ->
    try
      @config = require process.cwd() + '/webpack.config.js'
    catch err
      if err.code is 'MODULE_NOT_FOUND'
        pkgName = err.toString().match(/'(.*)'/)[1]

        if pkgName.indexOf('webpack.config.js') isnt -1
          console.log 'webpack.config.js not found'.bold.yellow
        else
          console.log err.toString().bold.red
          console.log "Did you installed #{pkgName.yellow}?"

      process.exit 1

    @compiler = webpack @config
    @DELAY_TIME = 2000

  startDevServer: =>
    runDevServer = =>
      setTimeout =>
        proxy = new httpProxy.createProxyServer()
        app = express()
        app.use require('webpack-dev-middleware')(@compiler,
          quiet: true
          publicPath: @config.output.publicPath
        )
        app.use require('webpack-hot-middleware')(@compiler)

        if @config.proxy
          paths = Object.keys @config.proxy
          paths.forEach (path) =>
            if typeof @config.proxy[path] is 'string'
              proxyOptions = {target: @config.proxy[path], ws: true}
            else
              proxyOptions = @config.proxy[path]

            app.all path, (req, res) ->
              proxy.web(req, res, proxyOptions)

        app.listen 3000, 'localhost', (err) =>
          if err
            console.log err
            return
          console.log 'Listening at http://localhost:3000'
      , @DELAY_TIME

    testPort = net.createServer()
      .once 'error', (err) ->
        if err.code is 'EADDRINUSE'
          console.log chalk.red.bold("ERROR:") + " Server port #{port} already in use"
          console.log "(maybe another `vtex watch -s` is running?)"
          process.exit 1
      .once 'listening', ->
        testPort.close()
        runDevServer()
      .listen 3000

  startWebpack: =>
    setTimeout =>
      @compiler.watch {}, (err, stats) ->
        if err
          console.error err.stack || err
          return

        outputOptions =
          cached: false
          cachedAssets: false
          colors: require 'supports-color'
          exclude: ["node_modules", "bower_components", "jam", "components"]

        console.log stats.toString(outputOptions) + '\n'
    , @DELAY_TIME

module.exports = new WebpackOption

