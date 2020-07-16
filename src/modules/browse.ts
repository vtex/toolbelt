import opn from 'opn'
import QRCode from 'qrcode-terminal'
import { SessionManager } from '../api/session/SessionManager'
import { storeUrl } from '../api/storeUrl'

interface BrowseOptions {
  qr: boolean
}

export default async (endpointInput: string, { qr }: BrowseOptions) => {
  const { account, workspace } = SessionManager.getSingleton()
  let endpoint = endpointInput ?? ''
  const uri = storeUrl({ account, workspace, path: endpoint })

  if (qr) {
    QRCode.generate(uri, { small: true })
    return
  }

  opn(uri, { wait: false })
}
