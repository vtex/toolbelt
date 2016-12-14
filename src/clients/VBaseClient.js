/* @flow */
import {Client} from '@vtex/api'
import {createGzip} from 'zlib'
import {basename} from 'path'
import mime from 'mime-types'

const data = data => data
const noTransforms = [data]

const endpoint = 'http://vbase.aws-us-east-1.vtex.io'
const routes = {
  Bucket: (account: string, workspace: string, bucket: string) =>
    `${routes.Workspace(account, workspace)}/buckets/${bucket}`,

  Files: (account: string, workspace: string, bucket: string) =>
    `${routes.Bucket(account, workspace, bucket)}/files`,

  File: (account: string, workspace: string, bucket: string, path: string) =>
    `${routes.Files(account, workspace, bucket)}/${path}`,
}

export default class VBaseClient extends Client {
  constructor ({authToken, userAgent, accept = '', timeout}) {
    super(endpoint, {authToken, userAgent, accept, timeout})
  }

  getBucket (account: string, workspace: string, bucket: string) {
    return this.http(routes.Bucket(account, workspace, bucket))
  }

  listFiles (account: string, workspace: string, bucket: string, prefix?: string) {
    const params = {prefix}
    return this.http(routes.Files(account, workspace, bucket), {params})
  }

  getFile (account: string, workspace: string, bucket: string, path: string) {
    return this.http(routes.Files(account, workspace, bucket, path), {transformResponse: noTransforms})
  }

  saveFile (account: string, workspace: string, bucket: string, path: string, stream: Readable, gzip?: boolean = true) {
    if (!(stream.pipe && stream.on)) {
      throw new Error('Argument stream must be a readable stream')
    }
    const finalStream = gzip ? stream.pipe(createGzip()) : stream
    const headers: Headers = gzip ? {'Content-Encoding': 'gzip'} : {}
    headers['Content-Type'] = mime.contentType(basename(path))
    return this.http.put(routes.Files(account, workspace, bucket, path), finalStream, {headers})
  }

  deleteFile (account: string, workspace: string, bucket: string, path: string) {
    return this.http.delete(routes.Files(account, workspace, bucket, path))
  }
}
