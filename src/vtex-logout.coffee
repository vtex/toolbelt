pkg = require '../package.json'
auth = require './lib/auth'

auth.logout().then(->
  console.log 'Local credentials cleared.'
).catch (error) ->
  if error.code is 'ENOENT' then console.log "You're already logged out"
  else console.log error console.log error

