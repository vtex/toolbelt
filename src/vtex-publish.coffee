Q = require 'q'
program = require 'commander'
pkg = require '../package.json'
metadata = require './lib/meta'
publisher = require './lib/publish'
auth = require './lib/auth'
chalk = require 'chalk'

program.version(pkg.version).parse process.argv

Q.all([
  auth.getValidCredentials()
  metadata.getAppMetadata()
]).spread((credentials, meta) ->
  name = meta.name
  version = meta.version
  owner = meta.owner

  publisher.publish(name, version, owner, credentials)
).then((app) ->
  console.log chalk.green("\nApp "+chalk.italic(app.app)+" version "+chalk.bold(app.version)+" was successfully published!")
).catch((error) ->
  console.error "\nFailed to publish app".red
  console.error error
)
