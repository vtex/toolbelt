import chalk from 'chalk'
import logger from '../../api/logger'
import { getManifest } from '../../api/manifest/ManifestUtil'
import { setupTooling } from './setupTooling'
import { setupTSConfig } from './setupTSConfig'
import { setupTypings } from './setupTypings'

interface SetupOpts {
  i?: boolean
  'ignore-linked'?: boolean
  all?: boolean
  tooling?: boolean
  typings?: boolean
  tsconfig?: boolean
}

export default async (opts: SetupOpts) => {
  const all = opts.all || (!opts.tooling && !opts.typings && !opts.tsconfig)
  const tooling = opts.tooling || all
  const typings = opts.typings || all
  const tsconfig = opts.tsconfig || all
  const ignoreLinked = opts.i || opts['ignore-linked']

  if (ignoreLinked && !(all || typings)) {
    logger.error(
      chalk`The flag {bold --ignore-linked (-i)} can only be used when {bold --typings} or {bold --all} are also used`
    )
  }

  const manifest = await getManifest()

  if (tooling) {
    setupTooling(manifest)
  }

  if (tsconfig) {
    await setupTSConfig(manifest, opts.tsconfig)
  }

  if (typings) {
    await setupTypings(manifest, ignoreLinked)
  }
}
