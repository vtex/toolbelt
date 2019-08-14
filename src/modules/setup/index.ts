import { getManifest } from '../../manifest'
import { setupESLint } from './setupESLint'
import { setupTSConfig } from './setupTSConfig'
import { setupTypings } from './setupTypings'

const buildersToAddAdditionalPackages = ['react', 'node']

export default async () => {
  const manifest = await getManifest()
  await setupESLint(manifest, buildersToAddAdditionalPackages)
  await setupTSConfig(manifest)
  await setupTypings(manifest)
}
