import { setupTooling } from '../utils/setup/setupTooling'
import { setupTSConfig } from '../utils/setup/setupTSConfig'
import { setupTypings } from '../utils/setup/setupTypings'
import { getManifest } from '../utils/manifest'

export async function setup(ignoreLinked: boolean) {
  const manifest = await getManifest()

  setupTooling(manifest)
  await setupTSConfig(manifest)
  await setupTypings(manifest, ignoreLinked)
}
