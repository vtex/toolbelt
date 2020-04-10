import { getWorkspace } from '../../conf'
import { copyToClipboard } from '../../utils/copyToClipboard'

export function authWorkspace() {
  const workspace = getWorkspace()
  copyToClipboard(workspace)
  return console.log(workspace)
}
