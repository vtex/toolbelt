program = require 'commander'
pkg = require '../package.json'
auth = require './lib/auth'
Q = require 'Q'

program.version(pkg.version).parse process.argv

auth.logout().then(->
  console.log 'Local credentials cleared.'
).catch (error) =>
  if error.code is 'ENOENT' then console.log "You're already logged out"
  else console.log error console.log error