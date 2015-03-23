program = require 'commander'
pkg = require '../package.json'

program.version(pkg.version)
  .command('login', 'log in with your VTEX credentials')
  .command('logout', 'clear local authentication credentials')
  .command('publish', 'publish this app to VTEX Gallery')
  .command('watch [sandbox]', 'start a development sandbox')
  .parse process.argv
