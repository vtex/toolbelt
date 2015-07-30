webpack = require 'webpack'
WebpackDevServer = require 'webpack-dev-server'
vtexwatch = require './vtex-watch'
path = require 'path'
net = require 'net'
chalk = require 'chalk'

vtexwatch.then(->
  try config = require process.cwd() + '/webpack.config.js'
  catch err then throw Error('webpack.config.js not found')

  DELAY_TIME = 2000
  SERVER_INDEX = process.argv.length - 2
  server = process.argv[SERVER_INDEX]
  compiler = webpack(config)

  if server is 'true'
    process.env['NODE_ENV'] = 'hot'
    options = config.devServer
    port = if options.port? then options.port else 8080
    host = if options.host? then options.host else 'localhost'

    startWDS = () ->
      setTimeout(->
        new WebpackDevServer(compiler, options).listen(port, host, (err) ->
          if err then throw err

          protocol = if options.https? then 'https' else 'http'
          if options.inline
            console.log(protocol + '://' + host + ':' + options.port + '/')
          else
            console.log(protocol + '://' + host + ':' + options.port + '/webpack-dev-server/')

          console.log('webpack result is served from ' + options.publicPath)
          if typeof options.contentBase is 'object'
            console.log('requests are proxied to ' + options.contentBase.target)
          else
            if options.contentBase
              if /^[0-9]$/.test(options.contentBase)
                options.contentBase = +options.contentBase
              else if not /^(https?:)?\/\//.test(options.contentBase)
                options.contentBase = path.resolve(options.contentBase)
            else if not options.contentBase
              options.contentBase = process.cwd()
            console.log('content is served from ' + options.contentBase)

          if options.historyApiFallback
            console.log('404s will fallback to /index.html')
        )
      , DELAY_TIME)

    testPort = net.createServer()
      .once('error', (err) ->
        if err.code is 'EADDRINUSE'
          console.log "Server port #{port} already in use".red
          process.exit()
      )
      .once('listening', ->
        testPort.close()
        startWDS()
      )
      .listen(port)
  else
    setTimeout(->
      compiler.watch({}, (err, stats) ->
        if (err)
          console.error(err.stack || err)
          return

        outputOptions =
          cached: false
          cachedAssets: false
          colors: require('supports-color')
          exclude: ["node_modules", "bower_components", "jam", "components"]

        console.log(stats.toString(outputOptions) + '\n')
      )
    , DELAY_TIME)
)

