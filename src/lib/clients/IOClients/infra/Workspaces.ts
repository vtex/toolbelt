import type { InstanceOptions, IOContext } from '@vtex/api'
import { Workspaces } from '@vtex/api/lib/clients/Workspaces'
import { IOClientFactory } from '../IOClientFactory'

export const createWorkspacesClient = (
  customContext: Partial<IOContext> = {},
  customOptions: Partial<InstanceOptions> = {}
) => {
  return IOClientFactory.createClient<Workspaces>(Workspaces, customContext, customOptions)
}
