import {Apps, Builder, Colossus, InstanceOptions, IOContext, Registry, Router, Workspaces} from '@vtex/api'
import Billing from './billingClient'

import {getAccount, getToken, getWorkspace} from './conf'
import * as env from './env'
import envTimeout from './timeout'
import userAgent from './user-agent'

const DEFAULT_TIMEOUT = 15000
const context = {
  account: getAccount(),
  authToken: getToken(),
  production: false,
  region: env.region(),
  userAgent,
  workspace: getWorkspace() || 'master',
}

const options = {
  timeout: (envTimeout || DEFAULT_TIMEOUT) as number,
}

const interceptor = <T>(client): T => new Proxy({}, {
  get: (_, name) => () => {
    throw new Error(`Error trying to call ${client}.${name} before login.`)
  },
}) as T

const createClients = (customContext: Partial<IOContext>, customOptions: InstanceOptions = {}) => {
  const mergedContext = {...context, ...customContext}
  const mergedOptions = {...options, ...customOptions}
  return {
    builder: new Builder(mergedContext, mergedOptions),
    colossus: new Colossus(mergedContext, mergedOptions),
    registry: new Registry(mergedContext, {...mergedOptions, endpoint: env.endpoint('registry')}),
  }
}

const [apps, router, workspaces, colossus, billing] = getToken()
  ? [
    new Apps(context, {...options, endpoint: env.endpoint('apps')}),
    new Router(context, {...options, endpoint: env.endpoint('router')}),
    new Workspaces(context, {...options, endpoint: env.endpoint('workspaces')}),
    new Colossus(context),
    new Billing(context, options),
  ]
  : [
    interceptor<Apps>('apps'),
    interceptor<Router>('router'),
    interceptor<Workspaces>('workspaces'),
    interceptor<Colossus>('colossus'),
    interceptor<Billing>('billing'),
  ]

export {
  apps,
  router,
  workspaces,
  colossus,
  createClients,
  billing,
}
