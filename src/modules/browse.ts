import open from 'open'
import opn from 'opn'
import QRCode from 'qrcode-terminal'
import { ToolbeltConfig } from '../api/clients/IOClients/apps/ToolbeltConfig'
import { ErrorKinds } from '../api/error/ErrorKinds'
import { ErrorReport } from '../api/error/ErrorReport'
import { SessionManager } from '../api/session/SessionManager'
import { storeUrl } from '../api/storeUrl'

interface BrowseOptions {
  qr: boolean
}

export default async (path: string, { qr }: BrowseOptions) => {
  const { account, workspace } = SessionManager.getSingleton()
  const uri = storeUrl({ account, workspace, path })

  if (qr) {
    QRCode.generate(uri, { small: true })
    return
  }
  try {
    const configClient = ToolbeltConfig.createClient()
    const { featureFlags } = await configClient.getGlobalConfig()
    if (featureFlags.FEATURE_FLAG_NEW_OPEN_PACKAGE) {
      open(uri, { wait: false })
    } else {
      opn(uri, { wait: false })
    }
  } catch (err) {
    ErrorReport.createAndMaybeRegisterOnTelemetry({
      kind: ErrorKinds.TOOLBELT_CONFIG_FEATURE_FLAG_ERROR,
      originalError: err,
    }).logErrorForUser({ coreLogLevelDefault: 'debug' })
  }
}
