import { getManifest, getAppRoot } from '../../manifest'
import { setupESLint } from './setupESLint'
import { setupTSConfig } from './setupTSConfig'
import { IOAppTypesManager } from './IOAppTypesManager'

const buildersToAddAdditionalPackages = ['react', 'node']

export default async (opts: { i?: boolean; 'ignore-linked': boolean }) => {
  const ignoreLinked = opts.i || opts['ignore-linked']
  const manifest = await getManifest()
  setupESLint(manifest, buildersToAddAdditionalPackages)
  await setupTSConfig(manifest)

  const root = getAppRoot()
  const typesManager = new IOAppTypesManager(root, manifest, { ignoreLinked })
  await typesManager.setupTypes()
}
