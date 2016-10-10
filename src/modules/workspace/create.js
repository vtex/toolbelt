import chalk from 'chalk'
import log from '../../logger'
import {client} from './utils'
import {getAccount} from '../../conf'

export default {
  requiredArgs: 'name',
  description: 'Create a new workspace with this name',
  handler: (name) => {
    log.debug('Creating workspace', name)
    return client().create(getAccount(), name)
    .then(() => log.info(`Workspace ${chalk.green(name)} created successfully`))
    .catch(err =>
      err.response && err.response.data.code === 'WorkspaceAlreadyExists'
        ? log.error(err.response.data.message)
        : Promise.reject(err)
    )
  },
}
