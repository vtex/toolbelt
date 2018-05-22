import { outputJson, readJson } from 'fs-extra'
import { resolve } from 'path'
import { assoc, keys, reduce } from 'ramda'

import log from '../../logger'

const PREFIX = 'npm:'
const npmReducer = dependencies => (acc: {}, k: string): {} =>
  assoc(PREFIX + k, dependencies[k], acc)
const vtexReducer = dependencies => (acc: {}, k: string): {} =>
  assoc(k, dependencies[k], acc)

export default async () => {
  const pkg = await readJson(resolve(process.cwd(), 'package.json'))
  const manifest = {
    ...pkg,
    dependencies: {
      ...reduce(vtexReducer(pkg.vtexDependencies), {}, keys(pkg.vtexDependencies).sort()),
      ...reduce(npmReducer(pkg.dependencies), {}, keys(pkg.dependencies).sort()),
    },
  }
  delete manifest.vtexDependencies
  if (manifest.vtexVersion) {
    manifest.version = manifest.vtexVersion
    delete manifest.vtexVersion
  }
  log.debug('Generating manifest:', JSON.stringify(manifest, null, 2))
  await outputJson(resolve(process.cwd(), 'manifest.json'), manifest, { spaces: 2 })
  log.info('Generated manifest.json successfully.')
}
