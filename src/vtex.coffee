docopt = require('docopt').docopt
pkg = require '../package.json'
spawn = require('child_process').spawn

doc = """
  VTEX Toolbelt

  Usage:
    vtex login
    vtex logout
    vtex publish
    vtex watch [-ws] <sandbox>
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
    <sandbox>      The sandbox name you wish to work on
"""

options = docopt(doc, version: pkg.version)


