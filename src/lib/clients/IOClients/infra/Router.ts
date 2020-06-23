import type { InstanceOptions, IOContext } from '@vtex/api'
import { Router } from '@vtex/api/lib/clients/Router'
import { IOClientFactory } from '../IOClientFactory'

export const createRouterClient = (
  customContext: Partial<IOContext> = {},
  customOptions: Partial<InstanceOptions> = {}
) => {
  return IOClientFactory.createClient<Router>(Router, customContext, customOptions)
}
