export const login = {
  command: 'login <account>',
  describe: 'Log into a VTEX account',
  builder: {},
  handler: (argv, log, conf, done) => {
    log.debug('Starting login')
    log.info('TODO')
    done()
  },
}

export const logout = {
  command: 'logout',
  describe: 'Logout of the current VTEX account',
  builder: {},
  handler: (argv, log, conf, done) => {
    log.debug('Starting logout')
    log.info('TODO')
    done()
  },
}
