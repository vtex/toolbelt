import log from '../../logger'
import deleteCmd from './delete'
import createCmd from './create'
import {getWorkspace} from '../../conf'

export default (name: string) => {
  log.debug('Resetting workspace', name)
  const workspace = name || getWorkspace()
  return deleteCmd(workspace, {_: [], yes: true, force: true})
    .delay(3000)
    .then(() => createCmd(workspace))
    .catch(err => {
      if (err.response && err.response.data.code === 'WorkspaceAlreadyExists') {
        setTimeout(() => createCmd(workspace), 3000)
        return
      }
      return Promise.reject(err)
    })
}
