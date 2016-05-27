export const newWorkspace = {
  command: 'workspace new <name>',
  alias: 'wn <name>',
  describe: 'Create a new workspace with this name',
  builder: {},
  handler: (argv, log, conf, done) => {
    log.debug('Creating workspace', argv.name)
    log.info('Create', argv.name)
    done()
  },
}

export const deleteWorkspace = {
  command: 'workspace delete <name>',
  alias: 'wd <name>',
  describe: 'Delete this workspace',
  builder: {},
  handler: (argv, log, conf, done) => {
    log.debug('Deleting workspace', argv.name)
    log.info('Delete', argv.name)
    done()
  },
}

export const promoteWorkspace = {
  command: 'workspace promote <name>',
  alias: 'wp <name>',
  describe: 'Promote this workspace to master',
  builder: {},
  handler: (argv, log, conf, done) => {
    log.debug('Promoting workspace', argv.name)
    log.info('TODO')
    done()
  },
}
