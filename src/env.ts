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

const regionFromEnv = {
  [Environment.Azure]: Region.Azure,
  [Environment.Staging]: Region.Staging,
  [Environment.Production]: Region.Production,
}

export function region(): string {
  return process.env.VTEX_REGION || regionFromEnv[getEnvironment()]
}

const publicEndpointFromEnv = {
  [Environment.Azure]: 'myvtextest.com',
  [Environment.Staging]: 'myvtexdev.com',
  [Environment.Production]: 'myvtex.com',
}

export function publicEndpoint(): string {
  return publicEndpointFromEnv[getEnvironment()]
}
