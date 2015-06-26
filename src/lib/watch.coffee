Q = require 'q'
path = require 'path'
fs = require 'fs'
auth = require './auth'
request = require 'request'
chokidar = require 'chokidar'
fileManager = require './file-manager'
tinylr = require 'tiny-lr'
crypto = require 'crypto'

class Watcher
  ChangeAction: {
    Save: "save",
    Remove: "remove"
  }
  changes: {}
  lastBatch: 0

  constructor: (@app, @vendor, @sandbox, @credentials) ->
    @lr = tinylr()
    @lr.listen(35729)

  watch: =>
    root = process.cwd()
    usePolling = (process.platform is 'win32') ? false
    fileManager.listFiles().then (result) =>
      deferred = Q.defer()
      ignore = (path.join(root, ignorePath) for ignorePath in result.ignore)

      watcher = chokidar.watch(root, {
        persistent: true,
        usePolling: usePolling,
        ignoreInitial: true,
        ignored: ignore
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
        console.log '\n', "File changes from app", "#{@app}".green, '\n'
        console.log '\n', 'Waiting for changes...', '\n'

        fileHashPromiseArray = Q.all(@generateFilesHash(result.files))
        Q.all([fileHashPromiseArray, @getSandboxFiles()]).spread (localFiles, sandboxFiles) =>
          for localFile in localFiles
            hashCompare = localFile.hash is sandboxFiles[localFile.path].hash
            console.log hashCompare
            rootLocalFile = path.resolve(root, localFile.path)
            @changes[rootLocalFile] = if hashCompare then @ChangeAction.Save else @ChangeAction.Remove

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
      url: "http://api.beta.vtex.com/#{@vendor}/sandboxes/#{@sandbox}/#{@app}/files"
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
    console.log '\n... files uploaded\n'.green
    tinylr.changed paths...

  changeSendError: (error, response) =>
    console.error 'Error sending files'.red
    if error
      console.error error
    if response
      console.error 'Status:', response.statusCode
      console.error 'Headers:', response.headers
      console.error 'Body:', response.body

  getSandboxFiles: =>
    options =
      url: "http://api.beta.vtex.com/#{@owner}/sandboxes/#{@sandbox}/#{@app}/files"
      method: 'GET'
      headers: {
        Authorization: 'token ' + @credentials.token
        'Accept': "application/vnd.vtex.gallery.v0+json"
        'Content-Type': "application/json"
        'x-vtex-accept-snapshot': false
      }

    Q.nfcall(request, options).then (data) =>
      response = data[0]
      if response.statusCode is 200
        return JSON.parse(response.body)
      else
        console.error 'Status:', response.statusCode

  generateFilesHash: (files) =>
    root = process.cwd()
    readAndHash = (filePath) -> Q.nfcall(fs.readFile, path.resolve(root, filePath)).then (content) ->
      hashedContent = crypto.createHash('md5').update(content, 'binary').digest('hex')
      return { path: filePath, hash: hashedContent }

    return (readAndHash(file) for file in files)

module.exports = Watcher

