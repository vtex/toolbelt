import { Region } from './conf'

export const envTimeout = process.env.VTEX_API_TIMEOUT as number | string

export function colossusEndpoint() {
  return process.env.VTEX_COLOSSUS_ENDPOINT || `https://infra.io.vtex.com/colossus/v0`
}

// TODO (@pedro823): the following functions were related to a cluster feature which is now
// deprecated. We should remove these functions later on.
export function region(): string {
  return Region.Production
}

export function publicEndpoint(): string {
  return 'myvtex.com'
}
