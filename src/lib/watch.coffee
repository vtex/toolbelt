Q = require 'q'
path = require 'path'
fs = require 'fs'
auth = require './auth'
request = require 'request'
chokidar = require 'chokidar'
fileManager = require './file-manager'
tinylr = require 'tiny-lr'
crypto = require 'crypto'
net = require 'net'

class Watcher
  ChangeAction: {
    Save: "save",
    Remove: "remove"
  }
  changes: {}
  lastBatch: 0
  lrPortInUse: false

  constructor: (@app, @vendor, @sandbox, @credentials) ->
    @endpoint = "http://api.beta.vtex.com"
    @acceptHeader = "application/vnd.vtex.gallery.v0+json"
    @lrRun(35729)

  watch: =>
    root = process.cwd()
    usePolling = (process.platform is 'win32') ? false
    fileManager.listFiles().then (result) =>
      deferred = Q.defer()
      @endpoint = result.endpoint if result.endpoint
      @acceptHeader = result.header if result.header
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
      .on('error', (error) ->
        deferred.reject(error)
      )
      .on('ready', =>
        @getFilesChanges(result.files).done (filesChanges) =>
          for filePath, changeAction of filesChanges
            rootFilePath = path.resolve(root, filePath)
            @changes[rootFilePath] = changeAction

          @debounce(true)
          deferred.resolve({app: @app})
      )
      deferred.promise

  onAdded: (filePath) =>
    @changes[filePath] = @ChangeAction.Save
    @debounce()

  onDirAdded: (dirPath) ->

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
      url: "#{@endpoint}/#{@vendor}/sandboxes/#{@sandbox}/#{@app}/files"
      method: 'POST'
      json: batchChanges
      headers: {
        Authorization: 'token ' + @credentials.token
        'Accept': @acceptHeader
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
    if paths.length > 0
      console.log '\n... files uploaded\n'.green

    options =
      url: "http://localhost:35729/changed"
      method: 'POST'
      json: { files: paths }

    request options, (error,response) =>
      if response.statusCode isnt 200
        @changeSendError(error, response)

  changeSendError: (error, response) ->
    console.error 'Error sending files'.red
    if error
      console.error error
    if response
      console.error 'Status:', response.statusCode
      console.error 'Headers:', response.headers
      console.error 'Body:', response.body

  getSandboxFiles: =>
    options =
      url: "#{@endpoint}/#{@vendor}/sandboxes/#{@sandbox}/#{@app}/files"
      method: 'GET'
      headers: {
        Authorization: 'token ' + @credentials.token
        'Accept': @acceptHeader
        'Content-Type': "application/json"
        'x-vtex-accept-snapshot': false
      }

    Q.nfcall(request, options).then (data) ->
      response = data[0]
      if response.statusCode is 200
        return JSON.parse(response.body)
      else if response.statusCode is 404
        return undefined
      else
        console.error 'Status:', response.statusCode

  generateFilesHash: (files) ->
    root = process.cwd()
    readAndHash = (filePath) -> Q.nfcall(fs.readFile, path.resolve(root, filePath)).then (content) ->
      hashedContent = crypto.createHash('md5').update(content, 'binary').digest('hex')
      return { path: filePath, hash: hashedContent }

    mapFiles = (filesArr) ->
      filesAndHash = {}
      for file in filesArr
        filesAndHash[file.path] = { hash: file.hash }
      return filesAndHash

    filesPromise = (readAndHash(file) for file in files)
    return Q.all(filesPromise).then(mapFiles)

  getFilesChanges: (files) =>
    passToChanges = (filesToLoop, filesToCompare) =>
      changes = {}
      filesToCompareExists = filesToCompare isnt undefined
      for file of filesToLoop
        if not filesToCompareExists
          changes[file] = @ChangeAction.Save
        else
          if not filesToCompare[file]?
            changes[file] = @ChangeAction.Remove
          else
            hashCompare = filesToCompare[file].hash isnt filesToLoop[file].hash
            # Delete prop to later see if there's any left after comparison
            delete filesToCompare[file]
            if hashCompare then changes[file] = @ChangeAction.Save

      compareKeys = Object.keys(filesToCompare).length unless not filesToCompareExists
      # If there's files left, this means we should upload them
      if compareKeys > 0
        for file of filesToCompare
          changes[file] = @ChangeAction.Save

      return changes

    Q.all([@generateFilesHash(files), @getSandboxFiles()]).spread (localFiles, sandboxFiles) ->
      if sandboxFiles? then passToChanges(sandboxFiles, localFiles) else passToChanges(localFiles)

  lrRun: (port) =>
    testPort = net.createServer()
      .once('error', (err) => @lrPortInUse = true if err.code is 'EADDRINUSE')
      .once('listening', =>
        testPort.close()
        @lr = tinylr()
        @lr.listen(port)
      )
      .listen(port)

module.exports = Watcher

