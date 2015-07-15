require 'shelljs/global'
path = require 'path'
Q = require 'q'
glob = require 'glob'
fs = require 'fs'
archiver = require 'archiver'

class FileManager
  constructor: () ->
    @temporaryZipFolder = path.resolve module.filename, "../../temporary"

  listFiles: =>
    deferred = Q.defer()
    @getIgnoredPatterns().then((ignoredPatterns) =>
      ignoredPatterns.push('**/.*', '**/*__', '**/*~')
      glob "**", nodir: true, ignore: ignoredPatterns, (er, files) =>
        deferred.resolve {files: files, ignore: ignoredPatterns}
    )
    deferred.promise

  getIgnoredPatterns: =>
    @readVtexIgnore().then((vtexIgnore) =>
      lines = vtexIgnore.match(/[^\r\n]+/g)
      ignored = lines.filter((line) => line.charAt(0) != '#' and line != '')
      ignored.map((item) => if item.substr(-1) is "/" then item += "**" else item)
    ).catch((e) => return [])

  readVtexIgnore: =>
    ignoreFile = (file) -> path.resolve process.cwd(), file
    readIgnore = (ignore) -> Q.nfcall(fs.readFile, ignore, "utf8")
    file = readIgnore(ignoreFile('.vtexignore'))
            .catch -> readIgnore(ignoreFile('.gitignore'))
    return file

  readVtexRc: =>
    vtexRc = path.resolve(process.cwd(), '.vtexrc')
    file = Q.nfcall(fs.readFile, vtexRc, "utf8")
    return file

  compressFiles: (app, version) =>
    @listFiles().then((result) =>
      zipPath = @getZipFilePath(app, version)

      if !test('-e', @temporaryZipFolder) then mkdir '-p', @temporaryZipFolder

      deferred = Q.defer()
      archive = archiver 'zip'
      output = fs.createWriteStream(zipPath)
      archive.pipe output

      archive.append(fs.createReadStream(path.resolve(process.cwd(), file)), {name: file}) for file in result.files
      archive.finalize()

      output.on 'close', ->
        console.log '\n', archive.pointer() + ' total bytes. Publishing...'
        deferred.resolve archive.pointer()

      archive.on 'error', (err) ->
        deferred.reject err

      deferred.promise
    )

  getZipFilePath: (app, version) =>
    return path.resolve module.filename, "../../temporary/#{app}-#{version}.zip"

  removeZipFile: (app, version) =>
    rm('-rf', @getZipFilePath(app, version))

fileManager = new FileManager()
module.exports =
  listFiles: fileManager.listFiles
  getZipFilePath: fileManager.getZipFilePath
  compressFiles: fileManager.compressFiles
  removeZipFile: fileManager.removeZipFile
