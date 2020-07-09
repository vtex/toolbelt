import { InstanceOptions, IOContext, Workspaces } from '@vtex/api'
import { IOClientFactory } from '../IOClientFactory'

export const createWorkspacesClient = (
  customContext: Partial<IOContext> = {},
  customOptions: Partial<InstanceOptions> = {}
) => {
  return IOClientFactory.createClient<Workspaces>(Workspaces, customContext, customOptions)
}
