import { setupGraphql as builderSetupGraphql } from './builderSetupGraphql'

export async function setupGraphQL(manifest: Manifest, builders?: string[]) {
  // code that should be moved to builder-hub
  return builderSetupGraphql(manifest, builders)
}
