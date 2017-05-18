import {Registry, Apps, Workspaces, Router, Colossus} from '@vtex/api'

import endpoint from './endpoint'
import envTimeout from './timeout'
import {version} from '../package.json'
import {getAccount, getWorkspace, getToken} from './conf'

export const userAgent = `Toolbelt/${version}`

const DEFAULT_TIMEOUT = 15000
const options = {
  authToken: getToken(),
  account: getAccount(),
  region: 'aws-us-east-1',
  userAgent,
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

const [apps, router, workspaces, colossus] = getToken()
  ? [
    Apps({...options, endpoint: endpoint('apps')}),
    Router({...options, endpoint: endpoint('router')}),
    Workspaces({...options, endpoint: endpoint('workspaces')}),
    Colossus({...options}),
  ]
  : [
    interceptor('apps'),
    interceptor('router') ,
    interceptor('workspaces'),
    interceptor('colossus'),
  ]

export {
  apps,
  router,
  accountRegistry,
  workspaces,
  colossus,
}
