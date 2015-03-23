request = require 'request'
fs = require 'fs'
path = require 'path'
Q = require 'Q'
fileManager = require './file-manager'

class AppPublisher
  constructor: ->
  publish: (app, version, owner, credentials) =>
    console.log "Publishing", "#{app}", "#{version}"
    @pushApp(app, version, owner, credentials)

  pushApp: (app, version, owner, credentials) =>

    fileManager.compressFiles(app, version).then( =>
      formData =
        attachments: [
            fs.createReadStream(fileManager.getZipFilePath(app, version))
        ]

      options =
        url: "http://api.beta.vtex.com/gallery/apps"
        method: 'POST'
        formData: formData
        headers: {
          Authorization : 'token ' + credentials.token
          'Accept' : "application/vnd.vtex.gallery.v0+json"
          'x-vtex-accept-snapshot' : false
        }

      request options, (error, response) =>
        fileManager.removeZipFile(app, version)
        if response.statusCode is 200 then console.log '\n', "App \'#{app}\' version \'#{version}\' was successfully published"
        else
          body = JSON.parse response.body
          console.error '\n', "Failed to publish app with status code #{response.statusCode}: \'#{body.message}\`".red
    )

appPublisher = new AppPublisher()
module.exports =
  publish: appPublisher.publish