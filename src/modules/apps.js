import log from '../logger'

export default {
  list: {
    alias: 'ls',
    description: 'List your installed VTEX apps',
    handler: () => {
      log.debug('Starting to list apps')
      log.info('You have no installed apps')
    },
  },
  install: {
    requiredArgs: 'app',
    alias: 'i',
    description: 'Install the specified app',
    handler: (app) => {
      log.debug('Starting to install app', app)
      log.info('Install app', app)
    },
  },
  uninstall: {
    requiredArgs: 'app',
    description: 'Uninstall the specified app',
    handler: (app) => {
      log.debug('Starting to uninstall app', app)
      log.info('Uninstall app', app)
    },
  },
  publish: {
    requiredArgs: 'app',
    description: 'Publish this app',
    handler: (app) => {
      log.debug('Starting to publish app', app)
      log.info('Publish app', app)
    },
  },
}
