path = require 'path'
fs = require 'fs'
Q = require 'q'
request = require 'request'
prompt = require 'prompt'

class AuthenticationService
  login: =>
    @askCredentials()
    .then @saveCredentials
    .catch (error) ->
      throw new Error error

  getValidCredentials: =>
    @getCurrentCredentials().then (credentials) =>
      @isTokenValid(credentials).then((validToken) =>
        if !validToken then @login() else return credentials
      )

  askCredentials: =>
    deferred = Q.defer()
    options =
      properties:
        account:
          message: 'account'
          required: true
        login:
          format: 'email'
          message: 'Must be a valid email'
          required: true
        password:
          hidden: true
          message: 'password (typing will be hidden)'
          required: true

    prompt.message = '> '
    prompt.delimiter = ''

    prompt.start()
    console.log 'Please log in with your VTEX credentials.', '\n'

    prompt.get options, (err, result) =>
      console.log 'Login failed. Please try again.' if err
      if result.login and result.password
        @getAuthenticationToken(result.login, result.password).then (token) ->
          deferred.resolve
            email: result.login
            token: token
            account: result.account
        .catch (error) ->
          deferred.reject error
      else
        deferred.reject result

    deferred.promise

  getAuthenticationToken: (email, password) =>
    deferred = Q.defer()
    @getTemporaryToken().then (token) =>
      requestOptions =
        uri: "https://vtexid.vtex.com.br/api/vtexid/pub/authentication/classic/validate" +
          "?authenticationToken=#{encodeURIComponent(token)}" +
          "&login=#{encodeURIComponent(email)}" +
          "&password=#{encodeURIComponent(password)}"

      request requestOptions, (error, response, body) =>
        if error
          @logErrorAndExit error
        else if response.statusCode isnt 200
          console.log JSON.parse(body).error
          deferred.reject "Invalid status code #{response.statusCode}"

        try
          auth = JSON.parse(body)
          if auth.authStatus != "Success" then deferred.reject "Authentication has failed with status #{auth.authStatus}".red
          deferred.resolve auth.authCookie.Value
        catch
          deferred.reject "Invalid JSON while authenticating with VTEX ID".red
    deferred.promise

  getCurrentCredentials: =>
    credentials = Q.nfcall(fs.readFile, @getCredentialsPath(), "utf8")
    .then(JSON.parse)
    .catch () -> {}
    return credentials

  isTokenValid: (credentials) =>
    deferred = Q.defer()

    requestOptions =
      uri: "https://vtexid.vtex.com.br/api/vtexid/pub/authenticated/user?authToken=#{encodeURIComponent(credentials.token)}"

    request requestOptions, (error, response, body) =>
      if error
        @logErrorAndExit error
      else if response.statusCode isnt 200
        console.log JSON.parse(body).error
        deferred.reject "Invalid status code #{response.statusCode}"

      try
        vtexIdUser = JSON.parse(body)
        return deferred.resolve false if vtexIdUser is null

        user = vtexIdUser.user
        return deferred.resolve true if user != null and user is credentials.email
      catch error
        deferred.reject 'Invalid JSON while getting token from VTEX ID'

    deferred.promise

  saveCredentials: (credentials) =>
    content = JSON.stringify credentials, null, 2
    credentialsPath = path.dirname(@getCredentialsPath())
    writeCredentials = (err) =>
      folderExist = err and err.code is 'EEXIST'
      if not err or folderExist
        Q.nfcall(fs.writeFile, @getCredentialsPath(), content)
      else
        throw err

    Q.nfcall(fs.mkdir, credentialsPath).finally(writeCredentials)
    credentials

  deleteCredentials: () =>
    Q.nfcall(fs.unlink, @getCredentialsPath())

  getTemporaryToken: =>
    deferred = Q.defer()
    requestOptions =
      uri: "https://vtexid.vtex.com.br/api/vtexid/pub/authentication/start"

    request requestOptions, (error, response, body) =>
      if error
        @logErrorAndExit error
      else if response.statusCode isnt 200
        console.log JSON.parse(body).error
        deferred.reject "Invalid status code #{response.statusCode}"

      try
        token = JSON.parse(body).authenticationToken
        deferred.resolve token
      catch
        deferred.reject 'Invalid JSON while getting token from VTEX ID'

    deferred.promise

  getCredentialsPath: ->
    home = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE
    path.resolve(home, '.vtex/credentials.json')

  logErrorAndExit: (error) ->
    if error.code is 'ENOTFOUND'
      console.log "Address #{error.hostname} not found".red +
                  '\nAre you online?'.yellow
    else
      console.log error
    process.exit()

auth = new AuthenticationService()

module.exports =
  login: auth.login
  logout: auth.deleteCredentials
  getValidCredentials: auth.getValidCredentials
  askCredentials: auth.askCredentials

