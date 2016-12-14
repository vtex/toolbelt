/* @flow */
import AppRegistryClient from './AppRegistryClient'
import AppEngineClient from './AppEngineClient'
import VBaseClient from './VBaseClient'
import WorkspacesClient from './WorkspacesClient'
import RouterClient from './RouterClient'
import {version} from '../../package.json'

const options = {
  authToken: 'abc123',
  userAgent: `Toolbelt/${version}`,
}

export function appRegistry (): AppRegistryClient {
  return new AppRegistryClient(options)
}

export function appEngine (): AppEngineClient {
  return new AppEngineClient(options)
}

export function vBase (): VBaseClient {
  return new VBaseClient(options)
}

export function workspaces (): WorkspacesClient {
  return new WorkspacesClient(options)
}

export function router (): RouterClient {
  return new RouterClient(options)
}
