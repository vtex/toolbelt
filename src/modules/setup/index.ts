/* eslint-disable @typescript-eslint/no-unused-vars */
import { getManifest } from '../../manifest'
import { setupTooling } from './setupTooling'
import { setupTSConfig } from './setupTSConfig'
import { setupTypings } from './setupTypings'

export default async (opts: { i?: boolean; 'ignore-linked': boolean }) => {
  const ignoreLinked = opts.i || opts['ignore-linked']
  const manifest = await getManifest()

  setupTooling(manifest)
  await setupTSConfig(manifest)
  await setupTypings(manifest, ignoreLinked)
}
