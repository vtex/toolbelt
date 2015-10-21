docopt = require('docopt').docopt
pkg = require '../package.json'
spawn = require('child_process').spawn
path = require 'path'

doc = """
  Usage:
    vtex login
    vtex logout
    vtex publish
    vtex watch [--webpack | --server]
    vtex --help
    vtex --version

  Commands:
    login         Log in with your VTEX credentials
    logout        Clear local authentication credentials
    publish       Publish this app to VTEX Gallery
    watch         Start a development sandbox

  Options:
    -h --help     Show this screen
    -v --version  Show version
    -w --webpack  Start with webpack
    -s --server   Start with dev server

"""

options = docopt doc, version: pkg.version

run = (command, argv = [], env = '') ->
  baseDir = path.dirname process.argv[1]
  args = ["#{baseDir}/#{command}"]
  args.push arg for arg in argv
  childEnv = Object.create process.env
  childEnv[env] = 'true' if env isnt ''

  if process.platform isnt 'win32'
    spawnOpts =
      stdio: 'inherit'
      customFds: [0, 1, 2]
      env: childEnv
    proc = spawn 'node', args, spawnOpts
  else
    spawnOpts =
      stdio: 'inherit'
      env: childEnv
    proc = spawn process.execPath, args, spawnOpts

  proc.on 'close', process.exit.bind(process)
  proc.on 'error', (err) ->
    if err.code == 'ENOENT'
      console.error '\n %s(1) does not exist, try --help\n', bin
    else if err.code == 'EACCES'
      console.error '\n %s(1) not executable. try chmod or run with root\n', bin

    process.exit 1

if options.login
  command = 'vtex-login'
else if options.logout
  command = 'vtex-logout'
else if options.publish
  command = 'vtex-publish'
else
  command = 'vtex-watch'
  env = 'HOT' if options['--server']
  argv = [
    options['--webpack'],
    options['--server']
  ]

run(command, argv, env)

