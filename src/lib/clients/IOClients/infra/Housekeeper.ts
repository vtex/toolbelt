import type { InstanceOptions, IOContext } from '@vtex/api'
import { Housekeeper } from '@vtex/api/lib/clients/Housekeeper'
import { IOClientFactory } from '../IOClientFactory'

export const createHousekeeperClient = (
  customContext: Partial<IOContext> = {},
  customOptions: Partial<InstanceOptions> = {}
) => {
  return IOClientFactory.createClient<Housekeeper>(Housekeeper, customContext, customOptions)
}
