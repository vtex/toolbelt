import * as archiver from 'archiver'

import axios, {AxiosInstance} from 'axios'

const routes = {
  Publish: '_v/publish',
}

export class Builder {
  private http: AxiosInstance

  constructor (opts: InstanceOptions) {
    const {account, workspace} = opts
    this.http = axios.create({
      baseURL: `http://${workspace}--${account}.myvtex.com`,
      headers: {
        'User-Agent': 'vtex.toolbelt',
      },
      validateStatus: status => (status >= 200 && status < 300) || status === 304,
    })
  }

  prePublishApp = (files: File[], _tag: string) => {
    if (!(files[0] && files[0].path && files[0].contents)) {
      throw new Error('Argument files must be an array of {path, contents}, where contents can be a String, a Buffer or a ReadableStream.')
    }
    const indexOfManifest = files.findIndex(({path}) => path === 'manifest.json')
    if (indexOfManifest === -1) {
      throw new Error('No manifest.json file found in files.')
    }
    const archive = archiver('zip')
    files.forEach(({contents, path}) => archive.append(contents, {name: path}))
    archive.finalize()
    return this.http.post(routes.Publish, archive, {
      params: {},
      headers: {'Content-Type': 'application/octet-stream'},
    })
  }
}

export type File = {
  path: string,
  contents: any,
}

export type InstanceOptions = {
  authToken: string,
  userAgent: string,
  account: string,
  workspace: string,
  region?: string,
  endpoint?: string,
  timeout?: number,
}
