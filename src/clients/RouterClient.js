/* @flow */
import {Client} from '@vtex/api'

const endpoint = 'http://kube-router.aws-us-east-1.vtex.io'
const routes = {
  AvailableServices: '/_services',

  AvailableVersions: (name) =>
    `${routes.AvailableServices}/${name}`,

  InstalledServices: (account: string, workspace: string) =>
    `/${account}/${workspace}/services`,

  InstalledService: (account: string, workspace: string, name: string) =>
    `/${routes.InstalledServices(account, workspace)}/services/${name}`,
}

export default class RouterClient extends Client {
  constructor ({authToken, userAgent, accept = '', timeout}) {
    super(endpoint, {authToken, userAgent, accept, timeout})
  }

  listAvailableServices () {
    return this.http.get(routes.AvailableServices)
  }

  getAvailableVersions (name: string) {
    return this.http.get(routes.AvailableVersions(name))
  }

  listInstalledServices (account: string, workspace: string) {
    return this.http.get(routes.InstalledServices(account, workspace))
  }

  installService (account: string, workspace: string, name: string, version: string) {
    return this.http.post(routes.InstalledServices(account, workspace), {name, version})
  }
}
