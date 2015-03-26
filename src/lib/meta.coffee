path = require 'path'
fs = require 'fs'
Q = require 'q'

class MetadataFile
  constructor: ->

  getAppMetadata: =>
    @readAppMetadata()
    .then(JSON.parse)
    .then(@validateMetadata)
    .catch((error) -> throw new Error (error.message.red))

  validateMetadata: (meta) =>
    if not meta['name']? then throw new Error 'Field \"name\" should be set in meta.json file'
    if not meta['version']? then throw new Error 'Field \"version\" should be set in meta.json file'
    if not meta['owner']? then throw new Error 'Field \"owner\" should be set in meta.json file'
    unless meta['owner'].match(/^[\w_-]+$/) then throw new Error 'Field \"owner\" may contain only letters, numbers, underscores and hyphens'

    if !(meta['version'].match(/^(\d+)\.(\d+)\.(\d+)(-.*)?$/)) then throw Error 'The version format is invalid'

    return meta

  readAppMetadata: =>
    metaPath = path.resolve process.cwd(), 'meta.json'
    meta = Q.nfcall(fs.readFile, metaPath, "utf8").catch( => throw new Error "Couldn't find meta.json file.")
    return meta

meta = new MetadataFile()

module.exports =
  getAppMetadata: meta.getAppMetadata