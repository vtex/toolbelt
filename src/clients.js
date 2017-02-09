/* @flow */
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

export const registry = Registry({...options, endpoint: endpoint('registry')})

export const apps = Apps({...options, endpoint: endpoint('apps')})

export const workspaces = Workspaces({...options, endpoint: endpoint('workspaces')})

export const router = Router({...options, endpoint: endpoint('router')})

export const vtexid = new ID(endpoint('vtexid'), options)
