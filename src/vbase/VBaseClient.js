import request from 'request-promise'
import checkRequiredParameters from './util/required.js'

const endpoints = {
  STABLE: 'http://vbase.vtex.com',
  BETA: 'http://vbase.beta.vtex.com',
}

class VBaseClient {
  constructor ({authToken, userAgent}) {
    this.endpointUrl = endpoints.BETA
    this.userAgent = userAgent
    this.authToken = authToken

    this.defaultRequestOptions = {
      json: true,
      resolveWithFullResponse: true,
      headers: {
        Authorization: `token ${this.authToken}`,
        'User-Agent': this.userAgent,
      },
    }
  }

  promote (account, workspace) {
    checkRequiredParameters({account, workspace})
    const url = `${this.endpointUrl}/${account}/master`

    return request.put({
      ...this.defaultRequestOptions,
      url,
      body: { workspace: workspace },
    })
  }

  list (account) {
    checkRequiredParameters({account})
    const url = `${this.endpointUrl}/${account}`
    return request.get({
      ...this.defaultRequestOptions,
      url,
    })
  }

  create (account, workspace) {
    checkRequiredParameters({account, workspace})
    const url = `${this.endpointUrl}/${account}`

    return request.post({
      ...this.defaultRequestOptions,
      url,
      body: { name: workspace },
    })
  }

  get (account, workspace) {
    checkRequiredParameters({account, workspace})
    const url = `${this.endpointUrl}/${account}/${workspace}`
    return request.get({
      ...this.defaultRequestOptions,
      url,
    })
  }

  delete (account, workspace) {
    checkRequiredParameters({account, workspace})
    const url = `${this.endpointUrl}/${account}/${workspace}`

    return request.delete({
      ...this.defaultRequestOptions,
      url,
    })
  }
}

export default VBaseClient
