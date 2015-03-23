path = require 'path'
fs = require 'fs'
Q = require 'Q'
request = require 'request'
prompt = require 'prompt'

class AuthenticationService
  constructor: ->
  login: =>
    @askCredentials()
    .then(@saveCredentials)
    .catch (error) =>
      throw new Error error

  getValidCredentials: =>
    @getCurrentCredentials().then (credentials) =>
      if credentials == null or !@isTokenValid credentials
        @login()
      else
        return credentials

  askCredentials: =>
    deferred = Q.defer()
    options =
      properties:
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
        @getAuthenticationToken(result.login, result.password).then (token) =>
          deferred.resolve {email: result.login, token: token}
        .catch (error) =>
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
        if error then deferred.reject error
        if response.statusCode isnt 200
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
    .catch () => null
    return credentials

  isTokenValid: (credentials) =>
    deferred = Q.defer()
    requestOptions =
      uri: "https://vtexid.vtex.com.br/api/vtexid/pub/authenticated/user?authToken=#{encodeURIComponent(credentials.token)}"

    request requestOptions, (error, response, body) =>
      deferred.reject error if error
      if response.statusCode isnt 200
        console.log JSON.parse(body).error
        deferred.reject "Invalid status code #{response.statusCode}"

      try
        deferred.resolve false if body?

        user = JSON.parse(body).User
        deferred.resolve true if user?.User is credentials.email
      catch error
        deferred.reject 'Invalid JSON while getting token from VTEX ID'

    deferred.promise

  saveCredentials: (credentials) =>
    content = JSON.stringify credentials, null, 2
    Q.nfcall(fs.writeFile, @getCredentialsPath(), content)
    credentials

  deleteCredentials: () =>
    Q.nfcall(fs.unlink, @getCredentialsPath())

  getTemporaryToken: =>
    deferred = Q.defer()
    requestOptions =
      uri: "https://vtexid.vtex.com.br/api/vtexid/pub/authentication/start"

    request requestOptions, (error, response, body) =>
      if error then deferred.reject error
      if response.statusCode isnt 200
        console.log JSON.parse(body).error
        deferred.reject "Invalid status code #{response.statusCode}"

      try
        token = JSON.parse(body).authenticationToken
        deferred.resolve token
      catch
        deferred.reject 'Invalid JSON while getting token from VTEX ID'

    deferred.promise

  getCredentialsPath: =>
    home = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE
    path.resolve(home, 'credentials.json')

auth = new AuthenticationService()

module.exports =
  login: auth.login
  logout: auth.deleteCredentials
  getValidCredentials: auth.getValidCredentials
  askCredentials: auth.askCredentials