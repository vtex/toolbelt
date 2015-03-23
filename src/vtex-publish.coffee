program = require 'commander'
pkg = require '../package.json'
metadata = require './lib/meta'
publisher = require './lib/publish'
auth = require './lib/auth'

program.version(pkg.version).parse process.argv

auth.getValidCredentials().then((credentials) ->
  metadata.getAppMetadata()
  .then((meta) -> publisher.publish(meta.name, meta.version, meta.owner, credentials))
).catch((error) => console.log error.message)