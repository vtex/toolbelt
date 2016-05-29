import log from '../logger'

export default {
  workspace: {
    new: {
      requiredArgs: 'name',
      description: 'Create a new workspace with this name',
      handler: (name) => {
        log.debug('Creating workspace', name)
        log.info('Create', name)
      },
    },
    delete: {
      requiredArgs: 'name',
      description: 'Delete this workspace',
      handler: (name) => {
        log.debug('Deleting workspace', name)
        log.info('Delete', name)
      },
    },
    promote: {
      requiredArgs: 'name',
      description: 'Promote this workspace to master',
      handler: (name) => {
        log.debug('Promoting workspace', name)
        log.info('Promote', name)
      },
    },
  },
}
