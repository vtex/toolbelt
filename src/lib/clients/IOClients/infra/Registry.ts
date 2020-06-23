import type { InstanceOptions, IOContext } from '@vtex/api'
import { Registry } from '@vtex/api/lib/clients/Registry'
import { IOClientFactory } from '../IOClientFactory'

export const createRegistryClient = (
  customContext: Partial<IOContext> = {},
  customOptions: Partial<InstanceOptions> = {}
) => {
  return IOClientFactory.createClient<Registry>(Registry, customContext, customOptions)
}
