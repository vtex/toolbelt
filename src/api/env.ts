import { Region, getCluster } from '../conf'

export const envTimeout = process.env.VTEX_API_TIMEOUT as number | string

export function colossusEndpoint() {
  return process.env.VTEX_COLOSSUS_ENDPOINT || `https://infra.io.vtex.com/colossus/v0`
}

export function cluster() {
  return process.env.VTEX_CLUSTER || getCluster() || ''
}

export function region(): string {
  return cluster() || Region.Production
}

export function publicEndpoint(): string {
  return cluster() ? 'myvtexdev.com' : 'myvtex.com'
}

export function clusterIdDomainInfix(): string {
  const upstreamCluster = cluster()
  return upstreamCluster ? `.${upstreamCluster}` : ''
}

export function envCookies(): string {
  const upstreamCluster = cluster()
  return upstreamCluster ? `VtexIoClusterId=${upstreamCluster}` : ''
}
