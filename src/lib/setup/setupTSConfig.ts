import R from 'ramda'

import { createClients } from '../../clients'
import log from '../../logger'
import { tsconfigEditor } from './utils'

const selectTSConfig = (tsconfigsFromBuilder: any, version: string, builder: string) => {
  const builderTSConfig = R.prop(builder, tsconfigsFromBuilder)
  if (builderTSConfig && R.has(version, builderTSConfig)) {
    return R.prop(version, builderTSConfig)
  }
  return null
}

const getTSConfig = async () => {
  try {
    const { builder: builderClient } = createClients({}, { retries: 2, timeout: 10000 })
    log.info(`Fetching BuilderHub tsconfig`)
    return await builderClient.builderHubTsConfig()
  } catch (err) {
    log.warn('Failed to get BuilderHub tsconfig')
    log.debug(err)
  }
}

export const setupTSConfig = async (manifest: Manifest) => {
  const tsconfigsFromBuilder = await getTSConfig()
  if (!tsconfigsFromBuilder) {
    return
  }

  const buildersWithBaseTSConfig = R.compose(
    R.reject(R.isNil),
    R.mapObjIndexed(R.curry(selectTSConfig)(tsconfigsFromBuilder)),
    R.prop('builders')
  )(manifest)

  return R.mapObjIndexed((baseTSConfig: any, builder: any) => {
    try {
      let currentTSConfig = {}
      try {
        currentTSConfig = tsconfigEditor.read(builder)
      } catch (e) {
        if (e.code === 'ENOENT') {
          log.warn(`No tsconfig.json found in ${tsconfigEditor.path(builder)}. Generating one...`)
        } else {
          throw e
        }
      }
      const newTSConfig = R.mergeDeepRight(currentTSConfig, baseTSConfig)
      log.info(`Merging BuilderHub ${builder} tsconfig with local ${builder} tsconfig`)
      tsconfigEditor.write(builder, newTSConfig)
    } catch (e) {
      log.error(e)
    }
  })(buildersWithBaseTSConfig as Record<string, any>)
}
