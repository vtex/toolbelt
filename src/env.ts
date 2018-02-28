import {Environment, getEnvironment} from './conf'

const env = process.env.VTEX_ENV === 'beta' ?
    Environment.Staging :
    (getEnvironment() || Environment.Production)

export function endpoint (api = 'api'): string {
  switch (api.toLowerCase()) {
    case 'vtexid':
      return process.env.VTEX_VTEXID_ENDPOINT || env
    case 'apps':
      return process.env.VTEX_APPS_ENDPOINT
    case 'registry':
      return process.env.VTEX_REGISTRY_ENDPOINT
    case 'router':
      return process.env.VTEX_ROUTER_ENDPOINT
    case 'workspaces':
      return process.env.VTEX_WORKSPACES_ENDPOINT
    case 'colossus':
      return process.env.VTEX_COLOSSUS_ENDPOINT || `http://colossus.${region()}.vtex.io`
    default:
      return process.env.VTEX_API_ENDPOINT || env
  }
}

export function region (): string {
  return process.env.VTEX_REGION ||
    (env === Environment.Staging ? 'aws-us-east-2' : 'aws-us-east-1')
}

export function publicEndpoint (): string {
  return env === Environment.Staging ? 'myvtexdev.com' : 'myvtex.com'
}
