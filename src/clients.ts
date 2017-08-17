import {Registry, Apps, Workspaces, Router, Colossus} from '@vtex/api'

import endpoint from './endpoint'
import envTimeout from './timeout'
import {getAccount, getWorkspace, getToken} from './conf'
import userAgent from './user-agent'

import {Builder} from './builder'

const DEFAULT_TIMEOUT = 15000
const options = {
  authToken: getToken(),
  account: getAccount(),
  region: 'aws-us-east-1',
  userAgent,
  workspace: getWorkspace() || 'master',
  timeout: envTimeout || DEFAULT_TIMEOUT,
}

const interceptor = <T>(client): T => new Proxy({}, {
  get: (_, name) => () => {
    throw new Error(`Error trying to call ${client}.${name} before login.`)
  },
}) as T

const createClients = (customOptions) => {
  return {
    registry: new Registry({...options, ...customOptions, endpoint: endpoint('registry')}),
    colossus: new Colossus({...options, ...customOptions}),
  }
}

const [apps, router, workspaces, colossus, builder] = getToken()
  ? [
    new Apps({...options, endpoint: endpoint('apps')}),
    new Router({...options, endpoint: endpoint('router')}),
    new Workspaces({...options, endpoint: endpoint('workspaces')}),
    new Colossus({...options}),
    new Builder({...options}),
  ]
  : [
    interceptor<Apps>('apps'),
    interceptor<Router>('router'),
    interceptor<Workspaces>('workspaces'),
    interceptor<Colossus>('colossus'),
    interceptor<Builder>('builder'),
  ]

export {
  apps,
  router,
  workspaces,
  colossus,
  builder,
  createClients,
}
