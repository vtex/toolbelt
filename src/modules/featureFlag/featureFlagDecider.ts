import { ToolbeltConfig } from '../../api/clients/IOClients/apps/ToolbeltConfig'
import open from 'open'
import { ErrorReport } from '../../api/error/ErrorReport'
import { ErrorKinds } from '../../api/error/ErrorKinds'
import opn from 'opn'
import logger from '../../api/logger'
import chalk from 'chalk'

export async function switchOpen(url: string, options) {
  try {
    const configClient = ToolbeltConfig.createClient()
    console.log(configClient.getGlobalConfig)
    const { featureFlags } = await configClient.getGlobalConfig()

    console.log(featureFlags)

    logger.info('Your browser should open automatically. You can also use the url below.')
    logger.info(`${chalk.cyan(url)}`)

    if (featureFlags.FEATURE_FLAG_NEW_OPEN_PACKAGE) {
      return open(url, options)
    }
    return opn(url, options)
  } catch (err) {
    ErrorReport.createAndMaybeRegisterOnTelemetry({
      kind: ErrorKinds.TOOLBELT_CONFIG_FEATURE_FLAG_ERROR,
      originalError: err,
    }).logErrorForUser({ coreLogLevelDefault: 'debug' })
  }
}
