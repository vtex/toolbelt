interface WorkspaceCreatorInput {
  targetWorkspace: string
  productionWorkspace?: boolean
  promptCreation?: boolean
  logIfAlreadyExists?: boolean
  clientContext?: {
    token: string
    workspace: string
    account: string
  }
}

export type WorkspaceCreateResult = 'exists' | 'created' | 'cancelled' | 'error'

export type WorkspaceCreator = (input: WorkspaceCreatorInput) => Promise<WorkspaceCreateResult>
