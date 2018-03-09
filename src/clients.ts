import {Apps, Builder, Colossus, Registry, Router, Workspaces} from '@vtex/api'

import {getAccount, getToken, getWorkspace} from './conf'
import * as env from './env'
import envTimeout from './timeout'
import userAgent from './user-agent'

const DEFAULT_TIMEOUT = 15000
const options = {
  account: getAccount(),
  authToken: getToken(),
  region: env.region(),
  timeout: (envTimeout || DEFAULT_TIMEOUT) as number,
  userAgent,
  workspace: getWorkspace() || 'master',
}

const interceptor = <T>(client): T => new Proxy({}, {
  get: (_, name) => () => {
    throw new Error(`Error trying to call ${client}.${name} before login.`)
  },
}) as T

const createClients = (customOptions) => {
  return {
    builder: new Builder({...options, ...customOptions}),
    colossus: new Colossus({...options, ...customOptions}),
    registry: new Registry({...options, ...customOptions, endpoint: env.endpoint('registry')}),
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
