const env = process.env.VTEX_ENV === 'beta' ? 'BETA' : 'STABLE'

export default function endpoint (api = 'api') {
  switch (api.toLowerCase()) {
    case 'vtexid':
      return process.env.VTEX_VTEXID_ENDPOINT || env
    case 'vbase':
      return process.env.VTEX_VBASE_ENDPOINT || env
    default:
      return process.env.VTEX_API_ENDPOINT || env
  }
}
