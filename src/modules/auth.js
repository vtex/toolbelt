import log from '../logger'

export default {
  login: {
    requiredArgs: 'store',
    optionalArgs: 'login',
    description: 'Log into a VTEX store',
    handler: (store, login) => {
      log.debug('Starting login', store)
      log.info('Store', store)
      log.info('Login', login)
    },
  },
  logout: {
    description: 'Logout of the current VTEX store',
    handler: () => {
      log.debug('Starting logout')
      log.info('See you soon!')
    },
  },
}
