import open from 'open'
import opn from 'opn'
import QRCode from 'qrcode-terminal'
import { ToolbeltConfig } from '../api/clients/IOClients/apps/ToolbeltConfig'
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
  const configClient = ToolbeltConfig.createClient()
  const { featureFlags } = await configClient.getGlobalConfig()

  if (featureFlags.FEATURE_FLAG_NEW_OPEN_PACKAGE) {
    open(uri, { wait: false })
  } else {
    opn(uri, { wait: false })
  }
}
