webpack = require 'webpack'
vtexwatch = require './vtex-watch'

vtexwatch.then(->
  try config = require process.cwd() + '/webpack.config.js'
  catch err then throw Error('webpack.config.js not found')

  webpack(config).watch({}, (err, stats) ->
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
)

