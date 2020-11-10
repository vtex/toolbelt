import { ToolbeltConfig } from '../api/clients/IOClients/apps/ToolbeltConfig'
import open from 'open'
import { ErrorReport } from '../api/error/ErrorReport'
import { ErrorKinds } from '../api/error/ErrorKinds'
import opn from 'opn'

export async function switchOpen(url: string, options) {
  try {
    const configClient = ToolbeltConfig.createClient()
    const { featureFlags } = await configClient.getGlobalConfig()

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
