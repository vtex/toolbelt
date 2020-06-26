import { InstanceOptions, IOContext, Registry } from '@vtex/api'
import { IOClientFactory } from '../IOClientFactory'

export const createRegistryClient = (
  customContext: Partial<IOContext> = {},
  customOptions: Partial<InstanceOptions> = {}
) => {
  return IOClientFactory.createClient<Registry>(Registry, customContext, customOptions)
}
