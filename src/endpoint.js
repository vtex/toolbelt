const env = process.env.VTEX_ENV === 'beta' ? 'BETA' : 'STABLE'

export default function endpoint (api = 'api') {
  switch (api.toLowerCase()) {
    case 'vtexid':
      return process.env.VTEX_VTEXID_ENDPOINT || env
    case 'vbase':
      return process.env.VTEX_VBASE_ENDPOINT
    case 'apps':
      return process.env.VTEX_APPS_ENDPOINT
    case 'registry':
      return process.env.VTEX_REGISTRY_ENDPOINT
    case 'router':
      return process.env.VTEX_ROUTER_ENDPOINT
    case 'workspaces':
      return process.env.VTEX_WORKSPACES_ENDPOINT
    case 'courier':
      return process.env.VTEX_COURIER_ENDPOINT || (env === 'BETA' ? 'http://courier.beta.vtex.com' : 'http://courier.vtex.com')
    case 'colossus':
      return process.env.VTEX_COLOSSUS_ENDPOINT || 'http://colossus.aws-us-east-1.vtex.io'
    default:
      return process.env.VTEX_API_ENDPOINT || env
  }
}
