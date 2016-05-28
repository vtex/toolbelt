import log from '../logger'

export default {
  workspace: {
    new: {
      requires: 'name',
      description: 'Create a new workspace with this name',
      handler: (name) => {
        log.debug('Creating workspace', name)
        log.info('Create', name)
      },
    },
    delete: {
      requires: 'name',
      description: 'Delete this workspace',
      handler: (name) => {
        log.debug('Deleting workspace', name)
        log.info('Delete', name)
      },
    },
    promote: {
      requires: 'name',
      description: 'Promote this workspace to master',
      handler: (name) => {
        log.debug('Promoting workspace', name)
        log.info('Promote', name)
      },
    },
  },
}
