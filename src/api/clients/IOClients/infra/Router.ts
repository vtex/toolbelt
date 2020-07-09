import { InstanceOptions, IOContext, Router } from '@vtex/api'
import { IOClientFactory } from '../IOClientFactory'

export const createRouterClient = (
  customContext: Partial<IOContext> = {},
  customOptions: Partial<InstanceOptions> = {}
) => {
  return IOClientFactory.createClient<Router>(Router, customContext, customOptions)
}
