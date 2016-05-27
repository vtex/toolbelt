export const list = {
  command: 'list',
  alias: 'ls',
  describe: 'List your installed VTEX apps',
  builder: {},
  handler: (argv, log, conf, done) => {
    log.debug('Starting to list apps')
    log.info('You have no installed apps')
    done()
  },
}

export const install = {
  command: 'install <app>',
  alias: 'i <app>',
  describe: 'Install the specified app',
  builder: {},
  handler: (argv, log, conf, done) => {
    log.debug('Starting to install app', argv.app)
    log.info('TODO')
    done()
  },
}

export const uninstall = {
  command: 'uninstall <app>',
  describe: 'Uninstall the specified app',
  builder: {},
  handler: (argv, log, conf, done) => {
    log.debug('Starting to uninstall app', argv.app)
    log.info('TODO')
    done()
  },
}
