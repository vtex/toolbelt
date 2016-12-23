/* @flow */
import AppRegistryClient from '@vtex/api/lib/AppRegistryClient'
import AppEngineClient from '@vtex/api/lib/AppEngineClient'
import WorkspacesClient from '@vtex/api/lib/WorkspacesClient'
import RouterClient from '@vtex/api/lib/RouterClient'
import VTEXIDClient from '@vtex/api/lib/VTEXIDClient'
import endpoint from './endpoint'
import {version} from '../package.json'

const options = {
  authToken: 'abc123',
  userAgent: `Toolbelt/${version}`,
}

export function registry (): AppRegistryClient {
  return new AppRegistryClient(endpoint('registry'), options)
}

export function apps (): AppEngineClient {
  return new AppEngineClient(endpoint('apps'), options)
}

export function workspaces (): WorkspacesClient {
  return new WorkspacesClient(endpoint('workspaces'), options)
}

export function router (): RouterClient {
  return new RouterClient(endpoint('router'), options)
}

export function vtexid (): VTEXIDClient {
  return new VTEXIDClient(endpoint('vtexid'), options)
}
