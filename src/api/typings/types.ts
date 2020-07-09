export interface BatchStream {
  path: string
  content: NodeJS.ReadableStream
  byteSize: number
}
