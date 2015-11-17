path = require 'path'
fs = require 'fs'
Q = require 'q'
request = require 'request'
prompt = require 'prompt'

class AuthenticationService
  login: =>
    @askCredentials()
    .then @createWorkspace
    .then @saveCredentials
    .catch (error) ->
      throw new Error error

  getValidCredentials: =>
    @getCurrentCredentials().then (credentials) =>
      @isTokenValid(credentials).then (validToken) =>
        if !validToken then @login() else return credentials

  askCredentials: =>
    deferred = Q.defer()
    options =
      properties:
        account:
          pattern: /^[\w\-]+$/
          message: 'Must not contain spaces'
          required: true
        login:
          format: 'email'
          message: 'Must be a valid email'
          required: true

    prompt.message = '> '
    prompt.delimiter = ''

    prompt.start()
    console.log 'Please log in with your VTEX credentials:\n'.green +
                'account  - The store account you want to be developing on\n' +
                'login    - Your VTEX registered email\n' +
                'password - Your VTEX registered password\n'

    prompt.get options, (err, result) =>
      if err then console.log '\nLogin failed. Please try again.'
      if result and result.login and result.account
        if result.login.indexOf('@vtex.com') isnt -1
          console.log '\nWe sent you an e-mail with your access token, please use it!'

          @sendCodeToEmail(result.login).then (token) =>
            startToken = token
            isUsingToken = true
            @getAccessKey(isUsingToken).then (code) =>
              @getEmailAuthenticationToken(result.login, startToken, code)
              .then (token) ->
                deferred.resolve
                  email: result.login
                  token: token
                  account: result.account
              .catch (error) ->
                deferred.reject error
        else
          @getAccessKey().then (password) =>
            @getAuthenticationToken(result.login, password).then (token) ->
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
          auth = JSON.parse body
          if auth.authStatus isnt 'Success' then deferred.reject "Authentication has failed with status #{auth.authStatus}".red
          deferred.resolve auth.authCookie.Value
        catch
          deferred.reject 'Invalid JSON while authenticating with VTEX ID'.red

    deferred.promise

  getCurrentCredentials: =>
    credentials = Q.nfcall fs.readFile, @getCredentialsPath(), 'utf8'
    .then JSON.parse
    .catch -> {}

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
        vtexIdUser = JSON.parse body
        return deferred.resolve false if vtexIdUser is null

        user = vtexIdUser.user
        return deferred.resolve true if user isnt null and user is credentials.email
      catch error
        deferred.reject 'Invalid JSON while getting token from VTEX ID'

    deferred.promise

  saveCredentials: (credentials) =>
    content = JSON.stringify credentials, null, 2
    credentialsPath = path.dirname @getCredentialsPath()
    writeCredentials = (err) =>
      folderExist = err and err.code is 'EEXIST'
      if not err or folderExist
        Q.nfcall fs.writeFile, @getCredentialsPath(), content
      else
        throw err

    Q.nfcall(fs.mkdir, credentialsPath).finally writeCredentials
    credentials

  deleteCredentials: () =>
    Q.nfcall fs.unlink, @getCredentialsPath()

  getTemporaryToken: =>
    deferred = Q.defer()
    requestOptions =
      uri: 'https://vtexid.vtex.com.br/api/vtexid/pub/authentication/start'

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
    home = process.env.HOME or process.env.HOMEPATH or process.env.USERPROFILE
    path.resolve home, '.vtex/credentials.json'

  logErrorAndExit: (error) ->
    if error.code is 'ENOTFOUND'
      console.log "Address #{error.hostname} not found".red +
                  '\nAre you online?'.yellow
    else
      console.log error

    process.exit 1

  createWorkspace: (credentials) ->
    deferred = Q.defer()
    options =
      url: "http://api.beta.vtex.com/#{credentials.account}/workspaces"
      method: 'POST'
      headers:
        Authorization: "token #{credentials.token}"
        Accept: 'application/vnd.vtex.gallery.v0+json'
        'Content-Type': 'application/json'
      json:
        name: "sb_#{credentials.email}"

    request options, (error, response) ->
      if error or response.statusCode not in [200, 201, 409]
        deferred.reject()
        console.log error or response.body.message
        process.exit 1

      deferred.resolve credentials

    deferred.promise

  sendCodeToEmail: (email) =>
    deferred = Q.defer()
    @getTemporaryToken().then (token) ->
      options =
        url:
          'https://vtexid.vtex.com.br/api/vtexid/pub/authentication/accesskey/' +
          "send?authenticationToken=#{token}&email=#{email}"
        method: 'GET'

      request options, (error, response) ->
        if error or response.statusCode isnt 200
          deferred.reject()
          console.log error or response.body.message
          process.exit 1

        deferred.resolve token

    deferred.promise

  getAccessKey: (isUsingToken = false) ->
    deferred = Q.defer()
    options =
      properties:
        password:
          hidden: true
          message: 'password (typing will be hidden)'
          required: true

    if isUsingToken
      options.properties.password.hidden = false
      options.properties.password.message = 'access token'

    prompt.message = '> '
    prompt.delimiter = ''

    prompt.start()

    prompt.get options, (err, result) =>
      if err then console.log '\nLogin failed. Please try again.'
      if result and result.password
        deferred.resolve result.password
      else
        deferred.reject

    deferred.promise

  getEmailAuthenticationToken: (email, token, code) ->
    deferred = Q.defer()
    options =
      url:
        'https://vtexid.vtex.com.br/api/vtexid/pub/authentication/accesskey/' +
        "validate?&login=#{email}&accesskey=#{code}" +
        "&authenticationToken=#{token}"
      method: 'GET'

    request options, (error, response, body) ->
      if error or response.statusCode isnt 200
        deferred.reject()
        console.log error or response.body.message
        process.exit 1

      try
        auth = JSON.parse body

        if auth.authStatus isnt 'Success'
          deferred.reject "Authentication has failed with status #{auth.authStatus}".red

        deferred.resolve auth.authCookie.Value
      catch
        deferred.reject 'Invalid JSON while authenticating with VTEX ID'.red

    deferred.promise

auth = new AuthenticationService()

module.exports =
  login: auth.login
  logout: auth.deleteCredentials
  getValidCredentials: auth.getValidCredentials
  askCredentials: auth.askCredentials
