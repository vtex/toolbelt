import { AppManifest } from '@vtex/api'
import { Readable } from 'stream'

declare global {
  interface Change {
    path: string
    action: 'save' | 'remove'
  }

  interface Batch {
    path: string
    content: string | Readable | Buffer | null
  }

  type Manifest = AppManifest

  interface InstalledApp {
    app: string
  }

  interface InfraResourceVersions {
    versions: {
      [region: string]: string[]
    }
  }

  interface IoVersions {
    version: string
    tested: boolean
    services: {
      [name: string]: string
    }
  }

  interface InfraUpdate {
    [name: string]: {
      latest: string
      current: string
    }
  }

  interface InfraVersionMap {
    latest: {
      [name: string]: string
    }
    update: InfraUpdate
  }

  interface File {
    type: 'file'
    name: string
    content: string
  }

  interface Folder {
    type: 'folder'
    name: string
    content: Structure
  }

  type Structure = Array<File | Folder>

  interface Message {
    level: string
    sender: string
    subject: string
    body: {
      code: string
      message: string
      details: any
      subject?: string
    }
  }

  type Unlisten = () => void

  interface MessageJSON {
    data: string
  }

  interface VersionByApp {
    location: string
    versionIdentifier: string
  }

  interface VersionsByAppResponse {
    data: VersionByApp[]
  }

  interface Context {
    account: string
    workspace: string
  }

  interface InstallResponse {
    code: string
    billingOptions?: string
    
  }
  interface PriceMetric {
    id: string
    ranges: Range[]
    customUrl: string
  }
  interface Price {
    subscription?: number
    metrics?: PriceMetric[]
  }
  interface Plan {
    id: string
    currency: string
    price: Price
  }

  interface BillingOptions {
    version?: string
    type?: string
    free?: boolean
    policies?: Policy[]
    deactivationRoute?: string
    termsURL?: string
    plans?: Plan[]
  }

  interface Policy {
    plan: string
    currency: string
    billing: Billing
  }

  interface Billing {
    taxClassification: string
    items: CalculationItem[]
  }

  interface CalculationItem {
    itemCurrency: string
    fixed: number
    calculatedByMetricUnit: CalculatedByMetricUnit
  }

  interface CalculatedByMetricUnit {
    metricId: string
    metricName: string
    minChargeValue: number
    ranges: Range[]
    route: string
  }

  interface Range {
    exclusiveFrom: number
    inclusiveTo: number
    multiplier: number
  }

  interface AvailabilityResponse {
    host: string | undefined
    hostname: string | undefined
    score: number
  }
}
