import log from '../../logger'
import deleteCmd from './delete'
import createCmd from './create'
import {getWorkspace} from '../../conf'

export default {
  optionalArgs: 'name',
  description: 'Delete and create a workspace',
  handler: function (name) {
    log.debug('Resetting workspace', name)
    const workspace = name || getWorkspace()
    return deleteCmd.handler(workspace, {_: [], yes: true, force: true})
    .delay(3000)
    .then(() => createCmd.handler(workspace))
    .catch(err => {
      if (err.response && err.response.data.code === 'WorkspaceAlreadyExists') {
        return setTimeout(() => createCmd.handler(workspace), 3000)
      }
      return Promise.reject(err)
    })
  },
}
