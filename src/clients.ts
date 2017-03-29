import {Registry, Apps, Workspaces, Router} from '@vtex/api'

import endpoint from './endpoint'
import envTimeout from './timeout'
import {version} from '../package.json'
import {getRegistryAccount, saveRegistryAccount, getAccount, getWorkspace} from './conf'

const DEFAULT_TIMEOUT = 15000
const options = {
  authToken: 'abc123',
  account: getAccount(),
  region: 'aws-us-east-1',
  userAgent: `Toolbelt/${version}`,
  workspace: getWorkspace() || 'master',
  timeout: envTimeout || DEFAULT_TIMEOUT,
}

saveRegistryAccount('smartcheckout')
export const apps = Apps({...options, endpoint: endpoint('apps')})
export const router = Router({...options, endpoint: endpoint('router')})
export const registry = Registry({...options, account: getRegistryAccount(), endpoint: endpoint('registry')})
export const workspaces = Workspaces({...options, endpoint: endpoint('workspaces')})
