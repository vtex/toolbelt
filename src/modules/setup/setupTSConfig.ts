import R from 'ramda'
import { Builder } from '../../api/clients/IOClients/apps/Builder'
import { ErrorKinds } from '../../api/error/ErrorKinds'
import { ErrorReport } from '../../api/error/ErrorReport'
import log from '../../api/logger'
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
    const builderClient = Builder.createClient({}, { retries: 3, timeout: 10000 })
    log.info(`Fetching BuilderHub tsconfig`)
    return await builderClient.builderHubTsConfig()
  } catch (err) {
    log.error('Failed to get BuilderHub tsconfig')
    throw err
  }
}

export const setupTSConfig = async (manifest: Manifest, warnOnNoBuilderCandidate: boolean) => {
  log.info(`Setting up tsconfig.json`)
  try {
    const tsconfigsFromBuilder = await getTSConfig()
    if (!tsconfigsFromBuilder) {
      if (warnOnNoBuilderCandidate) {
        log.warn(`No builders candidates for TSConfig setup`)
      }

      return
    }

    const buildersWithBaseTSConfig = R.compose(
      R.reject(R.isNil),
      R.mapObjIndexed(R.curry(selectTSConfig)(tsconfigsFromBuilder)),
      R.prop('builders')
    )(manifest)

    R.mapObjIndexed((baseTSConfig: any, builder: any) => {
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
    })(buildersWithBaseTSConfig as Record<string, any>)

    log.info('Finished setting up tsconfig.json')
  } catch (err) {
    log.error('Failed setting up tsconfig.json')
    ErrorReport.createAndMaybeRegisterOnTelemetry({
      kind: ErrorKinds.SETUP_TSCONFIG_ERROR,
      originalError: err,
    }).logErrorForUser()
  }
}
