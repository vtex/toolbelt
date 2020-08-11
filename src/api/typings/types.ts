export interface BatchStream {
  path: string
  content: NodeJS.ReadableStream
  byteSize: number
}

export interface WorkspaceResponse {
  name: string
  weight: number
  production: boolean
}
