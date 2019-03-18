import { Environment, getEnvironment, Region } from './conf'

export function endpoint(api: string): string {
  switch (api.toLowerCase()) {
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
      throw new Error('api argument is required')
  }
}

export function region(): string {
  return process.env.VTEX_REGION ||
    (getEnvironment() === Environment.Staging ? Region.Staging : Region.Production)
}

export function publicEndpoint(): string {
  return getEnvironment() === Environment.Staging ? 'myvtexdev.com' : 'myvtex.com'
}

export function clusterIdDomainInfix(): string {
  return process.env.VTEX_REGION ? `.${process.env.VTEX_REGION}` : ''
}

export function envCookies(): string {
  return process.env.VTEX_REGION ? `VtexIoClusterId=${process.env.VTEX_REGION}` : ''
}