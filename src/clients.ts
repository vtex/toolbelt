import {Registry, Apps, Workspaces, Router} from '@vtex/api'

import endpoint from './endpoint'
import envTimeout from './timeout'
import {version} from '../package.json'
import {getAccount, getWorkspace, getToken} from './conf'

const DEFAULT_TIMEOUT = 15000
const options = {
  authToken: getToken(),
  account: getAccount(),
  region: 'aws-us-east-1',
  userAgent: `Toolbelt/${version}`,
  workspace: getWorkspace() || 'master',
  timeout: envTimeout || DEFAULT_TIMEOUT,
}

const interceptor = (client) => new Proxy({}, {
  get: (_, name) => () => {
    throw new Error(`Error trying to call ${client}.${name} before login.`)
  },
})

const accountRegistry = (account: string = 'smartcheckout'): Registry => {
  return Registry({...options, account, endpoint: endpoint('registry')})
}

const [apps, router, workspaces] = getToken()
  ? [
    Apps({...options, endpoint: endpoint('apps')}),
    Router({...options, endpoint: endpoint('router')}),
    Workspaces({...options, endpoint: endpoint('workspaces')}),
  ]
  : [
    interceptor('apps'),
    interceptor('router') ,
    interceptor('workspaces'),
  ]

export {
  apps,
  router,
  accountRegistry,
  workspaces
}
