import type { InstanceOptions, IOContext } from '@vtex/api'
import { Apps } from '@vtex/api/lib/clients/Apps'
import { IOClientFactory } from '../IOClientFactory'

export const createAppsClient = (
  customContext: Partial<IOContext> = {},
  customOptions: Partial<InstanceOptions> = {}
) => {
  return IOClientFactory.createClient<Apps>(Apps, customContext, customOptions)
}
