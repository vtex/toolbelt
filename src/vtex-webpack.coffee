webpack = require 'webpack'
vtexwatch = require './vtex-watch'

vtexwatch.then ->
  try
    config = require process.cwd() + '/webpack.config.js'
  catch err
    throw Error('webpack.config.js not found')
  webpack(config).watch({}, ->)

