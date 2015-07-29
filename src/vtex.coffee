docopt = require('docopt').docopt
pkg = require '../package.json'
spawn = require('child_process').spawn

doc = """
  Usage:
    vtex login
    vtex logout
    vtex publish
    vtex watch [-w | -s] <sandbox>
    vtex -h | --help
    vtex -v | --version

  Commands:
    login          Log in with your VTEX credentials
    logout         Clear local authentication credentials
    publish        Publish this app to VTEX Gallery
    watch          Start a development sandbox

  Options:
    -h --help      Show this screen
    -v --version   Show version
    -w             Start with webpack
    -s             Start with webpack-dev-server

  Arguments:
    sandbox        The name of the sandbox you wish to work on

"""

options = docopt(doc, version: pkg.version)

run = (args) ->
  if process.platform isnt 'win32'
    proc = spawn('node', args, { stdio: 'inherit', customFds: [0, 1, 2] })
  else
    proc = spawn(process.execPath, args, { stdio: 'inherit'})

  proc.on('close', process.exit.bind(process))
  proc.on('error', (err) ->
    if err.code == "ENOENT"
      console.error('\n  %s(1) does not exist, try --help\n', bin)
    else if err.code == "EACCES"
      console.error('\n  %s(1) not executable. try chmod or run with root\n', bin)

    process.exit(1)
  )

if options.login
  run(['./vtex-login.js'])
else if options.logout
  run(['./vtex-logout.js'])
else if options.publish
  run(['./vtex-publish.js'])
else if options.watch
  run(['./vtex-watch.js'])

