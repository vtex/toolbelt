import { Housekeeper, InstanceOptions, IOContext } from '@vtex/api'
import { IOClientFactory } from '../IOClientFactory'

export const createHousekeeperClient = (
  customContext: Partial<IOContext> = {},
  customOptions: Partial<InstanceOptions> = {}
) => {
  return IOClientFactory.createClient<Housekeeper>(Housekeeper, customContext, customOptions)
}
