import { copyToClipboard } from './utils'
import { getWorkspace } from '../../conf'

export default () => {
  const workspace = getWorkspace()
  copyToClipboard(workspace)
  return console.log(workspace)
}
