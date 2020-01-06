import { Region, getCluster } from './conf'

export function colossusEndpoint() {
  return process.env.VTEX_COLOSSUS_ENDPOINT || `http://colossus.${region()}.vtex.io`
}

export function region(): string {
  return process.env.VTEX_CLUSTER || Region.Production
}

export function cluster() {
  return process.env.VTEX_CLUSTER || getCluster() || ''
}

export function publicEndpoint(): string {
  return region() === Region.Production ? 'myvtex.com' : 'myvtexdev.com'
}

export function clusterIdDomainInfix(): string {
  return cluster() ? `.${process.env.VTEX_CLUSTER}` : ''
}

export function envCookies(): string {
  return cluster() ? `VtexIoClusterId=${process.env.VTEX_CLUSTER}` : ''
}