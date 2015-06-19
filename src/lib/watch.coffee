Q = require 'q'
path = require 'path'
fs = require 'fs'
auth = require './auth'
request = require 'request'
chokidar = require 'chokidar'
fileManager = require './file-manager'
tinylr = require 'tiny-lr'

class Watcher
  ChangeAction: {
    Save: "save",
    Remove: "remove"
  }
  changes: {}
  lastBatch: 0

  constructor: (@app, @owner, @sandbox, @credentials) ->
    @lr = tinylr()
    @lr.listen(35729)

  watch: =>
    root = process.cwd()
    usePolling = (process.platform is 'win32') ? false
    fileManager.listFiles().then (result) =>
      deferred = Q.defer()

      for ignore, index in result.ignore
        result.ignore[index] = path.join root, ignore
      result.ignore.push /(^[.#]|(?:__|~)$)/

      watcher = chokidar.watch(root, {
        persistent: true,
        usePolling: usePolling,
        ignoreInitial: true,
        ignored: result.ignore
      })

      watcher
      .on('add', @onAdded)
      .on('addDir', @onDirAdded)
      .on('change', @onChanged)
      .on('unlink', @onUnlinked)
      .on('unlinkDir', @onDirUnlinked)
      .on('error', (error) =>
        deferred.reject(error)
      )
      .on('ready', =>
        @changes[path.resolve(root, file)] = @ChangeAction.Save for file in result.files
        @debounce(true)
        deferred.resolve({app: @app})
      )
      deferred.promise

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

  debounce: (resync) =>
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
      url: "http://api.beta.vtex.com/#{@owner}/sandboxes/#{@sandbox}/#{@app}/files"
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

    request options, (error, response, body) =>
      if response.statusCode is 200
        @changesSentSuccessfuly(batchChanges)
      else
        @changeSendError(error, response)

  changesSentSuccessfuly: (batchChanges) =>
    paths = batchChanges.map (change) -> change.path
    console.log '\n... files uploaded'.green
    tinylr.changed paths...

  changeSendError: (error, response) =>
    console.error 'Error sending files'.red
    if error
      console.error error
    if response
      console.error 'Status:', response.statusCode
      console.error 'Headers:', response.headers
      console.error 'Body:', response.body

module.exports = Watcher
