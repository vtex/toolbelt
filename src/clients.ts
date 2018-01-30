import {Registry, Apps, Builder, Workspaces, Router, Colossus} from '@vtex/api'

import * as env from './env'
import envTimeout from './timeout'
import {getAccount, getWorkspace, getToken} from './conf'
import userAgent from './user-agent'

const DEFAULT_TIMEOUT = 15000
const options = {
  authToken: getToken(),
  account: getAccount(),
  region: env.region(),
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
    registry: new Registry({...options, ...customOptions, endpoint: env.endpoint('registry')}),
    colossus: new Colossus({...options, ...customOptions}),
    builder: new Builder({...options, ...customOptions}),
  }
}

const [apps, router, workspaces, colossus] = getToken()
  ? [
    new Apps({...options, endpoint: env.endpoint('apps')}),
    new Router({...options, endpoint: env.endpoint('router')}),
    new Workspaces({...options, endpoint: env.endpoint('workspaces')}),
    new Colossus({...options}),
  ]
  : [
    interceptor<Apps>('apps'),
    interceptor<Router>('router'),
    interceptor<Workspaces>('workspaces'),
    interceptor<Colossus>('colossus'),
  ]

export {
  apps,
  router,
  workspaces,
  colossus,
  createClients,
}
