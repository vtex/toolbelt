import log from '../../logger'
import {deleteWorkspaces} from './delete'
import createCmd from './create'
import {getWorkspace} from '../../conf'

export default async (name: string) => {
  log.debug('Resetting workspace', name)
  const workspace = name || getWorkspace()
  try {
    await deleteWorkspaces([workspace])
    await createCmd(workspace)
  } catch (err) {
    if (err.response && err.response.data.code === 'WorkspaceAlreadyExists') {
      setTimeout(() => createCmd(workspace), 3000)
      return
    }
    throw err
  }
}
