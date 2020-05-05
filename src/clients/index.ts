import { Apps, InstanceOptions, IOContext, Registry, Router, Workspaces } from '@vtex/api'
import * as env from '../env'
import { envTimeout } from '../env'
import { createIOContext } from '../lib/clients'
import { SessionManager } from '../lib/session/SessionManager'
import Billing from './billingClient'
import { Builder } from './Builder'
import { EvolutionManager } from './evolutionManager'
import { Lighthouse } from './Lighthouse'
import { Rewriter } from './rewriter'
import { Tester } from './Tester'

const DEFAULT_TIMEOUT = 15000

const { token } = SessionManager.getSingleton()

const context: IOContext = createIOContext()
const clusterHeader = env.cluster() ? { 'x-vtex-upstream-target': env.cluster() } : null

const options = {
  timeout: (envTimeout || DEFAULT_TIMEOUT) as number,
  headers: {
    ...clusterHeader,
  },
}

const interceptor = <T>(client): T =>
  new Proxy(
    {},
    {
      get: (_, name) => () => {
        throw new Error(`Error trying to call ${client}.${name.toString()} before login.`)
      },
    }
  ) as T

const createClients = (customContext: Partial<IOContext> = {}, customOptions: InstanceOptions = {}) => {
  const mergedContext = { ...context, ...customContext }
  const mergedOptions = { ...options, ...customOptions }
  return {
    builder: new Builder(mergedContext, mergedOptions),
    registry: new Registry(mergedContext, mergedOptions),
    rewriter: new Rewriter(mergedContext, mergedOptions),
  }
}

const [apps, router, workspaces, billing, rewriter, tester, lighthouse, evolutionManager] = token
  ? [
      new Apps(context, options),
      new Router(context, options),
      new Workspaces(context, options),
      new Billing(context, options),
      new Rewriter(context, options),
      new Tester(context, options),
      new Lighthouse(context, options),
      new EvolutionManager(context, options),
    ]
  : [
      interceptor<Apps>('apps'),
      interceptor<Router>('router'),
      interceptor<Workspaces>('workspaces'),
      interceptor<Billing>('billing'),
      interceptor<Rewriter>('rewriter'),
      interceptor<Tester>('Tester'),
      interceptor<Lighthouse>('Lighthouse'),
      interceptor<EvolutionManager>('EvolutionManager'),
    ]

export { apps, router, workspaces, createClients, billing, rewriter, tester, lighthouse, evolutionManager }
