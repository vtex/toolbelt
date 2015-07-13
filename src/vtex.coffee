program = require 'commander'
pkg = require '../package.json'

program.version(pkg.version)
  .command('login', 'log in with your VTEX credentials')
  .command('logout', 'clear local authentication credentials')
  .command('publish', 'publish this app to VTEX Gallery')
  .command('watch [sandbox]', 'start a development sandbox')
  .command('webpack [sandbox]', 'start a development sandbox and webpack')
  .parse process.argv

# Show help if no command was specified
args = process.argv.slice(2)
if !args.length
  program.outputHelp()

# Give feedback when user types an unkown command
foundCommand = false
for command in program.commands
  if command._name in args
    foundCommand = true

if not foundCommand
  console.log 'vtex: \''+args+'\' is not a command. See \'vtex help\'. \n'

