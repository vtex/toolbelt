pkg = require '../package.json'
auth = require './lib/auth'

auth.login().then((data) ->
  console.log "\n", "Logged in as #{data.email}".green
).catch (error) ->
  console.log error.message
