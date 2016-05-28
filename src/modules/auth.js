import log from '../logger'

export default {
  login: {
    requires: 'store',
    description: 'Log into a VTEX store',
    handler: (store) => {
      log.debug('Starting login', store)
      log.info('Store', store)
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
