/* @flow */
import {createGzip} from 'zlib'
import Stream from 'stream'
import {Client} from '@vtex/api'
import archiver from 'archiver'

type File = {
  path: string,
  contents: any,
}

const endpoint = 'http://apps-registry.aws-us-east-1.vtex.io'
const routes = {
  Registry: (account: string) =>
    `/${account}/master/registry`,

  Vendor: (account: string, vendor: string) =>
    `${routes.Registry(account)}/${vendor}/apps`,

  App: (account: string, vendor: string, name: string, version?: string) =>
    version
    ? `${routes.Vendor(account, vendor)}/${name}/${version}`
    : `${routes.Vendor(account, vendor)}/${name}`,
}

export default class AppRegistryClient extends Client {
  constructor ({authToken, userAgent, accept = '', timeout}) {
    super(endpoint, {authToken, userAgent, accept, timeout})
  }

  /**
   * Sends an app as a zip file.
   * @param account
   * @param files An array of {path, contents}, where contents can be a String, a Buffer or a ReadableStream.
   * @return Promise
   */
  publishApp (account: string, files: Array<File>, tag?: string) {
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
    return this.http({
      method: 'POST',
      url: routes.Registry(account),
      data: archive,
      params: tag ? {tag} : {},
      headers: {
        'Content-Type': 'application/octet-stream',
      },
    })
  }

  publishAppPatch (account: string, vendor: string, name: string, version: string, changes: any) {
    const gz = createGzip()
    const stream = new Stream.Readable()
    stream.push(JSON.stringify(changes))
    stream.push(null)
    return this.http({
      method: 'PATCH',
      data: stream.pipe(gz),
      url: routes.App(account, vendor, name, version),
      headers: {
        'Content-Encoding': 'gzip',
        'Content-Type': 'application/json',
      },
    })
  }

  listVendors (account: string) {
    return this.http(routes.Registry(account))
  }

  listAppsByVendor (account: string, vendor: string) {
    return this.http(routes.Vendor(account, vendor))
  }

  listVersionsByApp (account: string, vendor: string, name: string) {
    return this.http(routes.App(account, vendor, name))
  }

  getAppManifest (account: string, vendor: string, name: string, version: string) {
    return this.http(routes.App(account, vendor, name, version))
  }

  unpublishApp (account: string, vendor: string, name: string, version: string) {
    return this.http.delete(routes.App(account, vendor, name, version))
  }
}
