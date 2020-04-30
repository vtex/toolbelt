import { InstanceOptions, IOContext, Workspaces } from '@vtex/api'
import { createDummyLogger } from '../../clients/dummyLogger'
import { TelemetryClient } from '../../clients/telemetryClient'
import * as env from '../../env'
import userAgent from '../../user-agent'
import { SessionManager } from '../session/SessionManager'

interface IOContextOptions {
  account?: string
  authToken?: string
  region?: string
  workspace?: string
}

const clusterHeader = env.cluster() ? { 'x-vtex-upstream-target': env.cluster() } : null
const DEFAULT_TIMEOUT = 15000

const defaultOptions = {
  timeout: (env.envTimeout || DEFAULT_TIMEOUT) as number,
  headers: {
    ...clusterHeader,
  },
}

export const createIOContext = (opts?: IOContextOptions): IOContext => {
  const session = SessionManager.getSingleton()
  const {
    account = session.account,
    authToken = session.token,
    region = env.region(),
    workspace = session.workspace || 'master',
  } = opts ?? {}

  return {
    account,
    userAgent,
    workspace,
    authToken,
    region,
    production: false,
    product: '',
    route: {
      id: '',
      params: {},
    },
    requestId: '',
    operationId: '',
    platform: '',
    logger: createDummyLogger(),
  }
}

export const mergeCustomOptionsWithDefault = (customOptions: InstanceOptions) => {
  const mergedOptions = { ...defaultOptions, ...customOptions }
  mergedOptions.headers = { ...defaultOptions.headers, ...customOptions.headers }
  return mergedOptions
}

export const createWorkspaceClient = (ctx: IOContext, customOptions: InstanceOptions = {}) => {
  return new Workspaces(ctx, mergeCustomOptionsWithDefault(customOptions))
}

export const createTelemetryClient = (ctx: IOContext, customOptions: InstanceOptions = {}) => {
  return new TelemetryClient(ctx, mergeCustomOptionsWithDefault(customOptions))
}
