import axios from 'axios'
import { PackageJson } from '../../lib/packageJson'

interface PackageMetadata extends PackageJson {
  deprecated?: string
}

export class NpmClient {
  private static REGISTRY_BASE_URL = 'http://registry.npmjs.org'

  public static getPackageMetadata(name: string, version: string): Promise<PackageMetadata> {
    return axios.get(`${this.REGISTRY_BASE_URL}/${name}/${version}`).then(response => response.data)
  }
}
