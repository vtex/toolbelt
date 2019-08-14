import * as R from 'ramda'
import log from '../../logger'
import { BuilderHubDatasource } from './BuilderHubDatasource'
import { tsconfigEditor } from './utils'

const selectTSConfig = (tsconfigsFromBuilder: any, version: string, builder: string) => {
  const builderTSConfig = R.prop(builder, tsconfigsFromBuilder)
  if (builderTSConfig && R.has(version, builderTSConfig)) {
    return R.prop(version, builderTSConfig)
  }
  return null
}

export const setupTSConfig = async (manifest: Manifest) => {
  const tsconfigsFromBuilder = await BuilderHubDatasource.builderHubTsConfig()
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
      tsconfigEditor.write(builder, newTSConfig)
    } catch (e) {
      log.error(e)
    }
  })(buildersWithBaseTSConfig as Record<string, any>)
}
