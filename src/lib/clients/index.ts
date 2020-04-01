import { InstanceOptions, IOContext, Workspaces } from '@vtex/api'
import { dummyLogger } from '../../clients/dummyLogger'
import { TelemetryClient } from '../../clients/telemetryClient'
import * as env from '../../env'

interface DefaultIOContextRequirements {
  account: string
  authToken: string
  region: string
  userAgent: string
  workspace: string
}

const clusterHeader = env.cluster() ? { 'x-vtex-upstream-target': env.cluster() } : null
const DEFAULT_TIMEOUT = 15000

const defaultOptions = {
  timeout: (env.envTimeout || DEFAULT_TIMEOUT) as number,
  headers: {
    ...clusterHeader,
  },
}

export const createIOContext = ({
  account,
  authToken,
  region,
  userAgent,
  workspace,
}: DefaultIOContextRequirements): IOContext => {
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
    logger: dummyLogger,
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
