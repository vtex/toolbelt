/* @flow */
import type {RegistryInstance, AppsInstance, WorkspacesInstance, RouterInstance} from '@vtex/api'
import {Registry, Apps, Workspaces, Router, ID} from '@vtex/api'
import endpoint from './endpoint'
import {version} from '../package.json'
import {getAccount, getWorkspace} from './conf'

const options = {
  account: getAccount(),
  workspace: getWorkspace(),
  authToken: 'abc123',
  userAgent: `Toolbelt/${version}`,
  region: 'aws-us-east-1',
}

export function registry (): RegistryInstance {
  return Registry({...options, endpoint: endpoint('registry')})
}

export function apps (): AppsInstance {
  return Apps({...options, endpoint: endpoint('apps')})
}

export function workspaces (): WorkspacesInstance {
  return Workspaces({...options, endpoint: endpoint('workspaces')})
}

export function router (): RouterInstance {
  return Router({...options, endpoint: endpoint('router')})
}

export function vtexid (): ID {
  return new ID(endpoint('vtexid'), options)
}
