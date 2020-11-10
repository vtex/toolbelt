import QRCode from 'qrcode-terminal'
import { SessionManager } from '../api/session/SessionManager'
import { storeUrl } from '../api/storeUrl'
import { switchOpen } from './featureFlagDecider'

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
  switchOpen(uri, { wait: false })
}
