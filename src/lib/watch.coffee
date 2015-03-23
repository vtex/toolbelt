path = require 'path'
fs = require 'fs'
auth = require './auth'
request = require 'request'
chokidar = require 'chokidar'
fileManager = require './file-manager'

class Watcher
  ChangeAction: {
    Save: "save",
    Remove: "remove"
  }
  changes: {}
  lastBatch: 0

  constructor: (@app, @owner, @sandbox, @credentials) ->

  watch: =>
    root = process.cwd()
    usePolling = (process.platform is 'win32') ? false

    fileManager.listFiles().then((result) =>
      watcher = chokidar.watch root, persistent: true, usePolling: usePolling, ignoreInitial: true,
      ignored: (filePath) -> /(^[.#]|(?:__|~)$)/.test path.basename(filePath), result.ignore

      watcher
      .on('add', @onAdded)
      .on('addDir', @onDirAdded)
      .on('change', @onChanged)
      .on('unlink', @onUnlinked)
      .on('unlinkDir', @onDirUnlinked)
      .on('error', (error) =>)
      .on('ready', =>
        console.log '\n', "File changes from app", "#{@app}".green, '\n'
        console.log '\n', 'Waiting for changes...', '\n'

        @changes[path.resolve(root, file)] = @ChangeAction.Save for file in result.files
        @debounce(true)
      )
    )

  onAdded: (filePath) =>
    @changes[filePath] = @ChangeAction.Save
    @debounce()

  onDirAdded: (dirPath) =>

  onChanged: (filePath) =>
    @changes[filePath] = @ChangeAction.Save
    @debounce()

  onUnlinked: (filePath) =>
    @changes[filePath] = @ChangeAction.Remove
    @debounce()

  onDirUnlinked: (filePath) =>
    @changes[filePath] = @ChangeAction.Remove
    @debounce()

  debounce: (resync)=>
    thisBatch = ++@lastBatch
    setTimeout((() => @trySendBatch(thisBatch, resync)), 200)

  getChanges: (batch) =>
    root = path.resolve ''
    for item in batch
      if item.action is @ChangeAction.Save
        try
          data = fs.readFileSync item.path
          item.content = data.toString('base64')
          item.encoding = 'base64'
        catch e
          item.action = @ChangeAction.Remove

      item.path = item.path.substring(root.length + 1).replace(/\\/g, '/')

    batch.filter (item) => item.action is @ChangeAction.Save || item.action is @ChangeAction.Remove

  trySendBatch: (thisBatch, resync) =>
    return unless thisBatch is @lastBatch

    batch = for filePath, action of @changes when action
      action: action
      path: filePath

    @changes = {}
    @lastBatch = 0
    batchChanges = @getChanges(batch)

    refresh = (resync?) ? false
    @sendChanges(batchChanges, refresh)

  sendChanges: (batchChanges, refresh) =>
    options =
      url: "http://api.beta.vtex.com/gallery/sandbox/#{@app}/changes"
      method: 'POST'
      json: batchChanges
      headers: {
        Authorization: 'token ' + @credentials.token
        'Accept': "application/vnd.vtex.gallery.v0+json"
        'Content-Type': "application/json"
        'x-vtex-accept-snapshot': false
      }

    options.url += "?resync=true" if refresh

    for change in batchChanges
      if change.action is 'save'
        console.log 'U'.yellow + " #{change.path}"
      else if change.action is 'remove'
        console.log 'D'.red + " #{change.path}"
      else
        console.log "#{change.action.grey} #{change.path}"


    request options, (error, response) =>
      if response.statusCode is 200 then console.log '\n', '...Files uploaded'
      else
        console.error 'Status:', response.statusCode

module.exports = Watcher