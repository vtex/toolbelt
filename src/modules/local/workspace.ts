import clipboardy from 'clipboardy'
import { getWorkspace } from '../../conf'

export default () => {
  const workspace = getWorkspace()
  clipboardy.writeSync(workspace)
  return console.log(workspace)
}
