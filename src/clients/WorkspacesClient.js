/* @flow */
import {Client} from '@vtex/api'

const endpoint = 'http://kube-router.aws-us-east-1.vtex.io'
export const defaultWorkspace = 'master'

const routes = {
  Account: (account) =>
    `/${account}`,

  Workspace: (account, workspace) =>
    `${routes.Account(account)}/${workspace}`,

  DefaultWorkspace: (account) =>
    `${routes.Workspace(account, defaultWorkspace)}`,
}

export default class WorkspacesClient extends Client {
  constructor ({authToken, userAgent, accept = '', timeout}) {
    super(endpoint, {authToken, userAgent, accept, timeout})
  }

  list (account: string) {
    return this.http(routes.Account(account))
  }

  get (account: string, workspace: string) {
    return this.http(routes.Workspace(account, workspace))
  }

  create (account: string, workspace: string) {
    return this.http.post(routes.Account(account), {name: workspace})
  }

  delete (account: string, workspace: string) {
    return this.http.delete(routes.Workspace(account, workspace))
  }

  promote (account: string, workspace: string) {
    return this.http.put(routes.DefaultWorkspace(account, workspace), {workspace})
  }
}

