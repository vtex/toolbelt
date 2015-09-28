webpack = require 'webpack'
express = require 'express'
httpProxy = require 'http-proxy'
path = require 'path'
net = require 'net'
chalk = require 'chalk'

class WebpackRunner
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
    port = 3000

    setTimeout =>
      proxy = new httpProxy.createProxyServer()
      app = express()
      app.use require('webpack-dev-middleware')(@compiler,
        noInfo: true
        publicPath: @config.output.publicPath
      )
      app.use require('webpack-hot-middleware')(@compiler)

      if @config.proxy
        if !Array.isArray @config.proxy
          @config.proxy = Object.keys(@config.proxy).map (path) =>
            if typeof @config.proxy[path] is 'string'
              proxyOptions = path: path, target: @config.proxy[path]
            else
              proxyOptions = @config.proxy[path]
              proxyOptions.path = path

            proxyOptions

        @config.proxy.forEach (proxyOptions) ->
          app.all proxyOptions.path, (req, res) ->
            if typeof proxyOptions.rewrite is 'function'
              proxyOptions.rewrite req, proxyOptions

            if proxyOptions.host
              req.headers.host = proxyOptions.host

            proxy.web req, res, proxyOptions, (err) ->
              msg = "cannot proxy to #{proxyOptions.target} (#{err.message})"
              res.statusCode = 502
              res.end()

            if proxyOptions.configure
              proxyOptions.configure proxy


      app
        .listen port, 'localhost', (err) ->
          if err
            console.log err
            return

          console.log "Listening at http://localhost:#{port}"
        .on 'error', (err) ->
          if err.code is 'EADDRINUSE'
            console.log "#{'ERROR:'.bold.red} Server port #{port} already in use"
            console.log "(maybe another `vtex watch -s` is running?)"
            process.exit 1
    , @DELAY_TIME

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

module.exports = WebpackRunner

