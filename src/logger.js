import winston from 'winston'

// TODO: Configure transport to send errors to Splunk
winston.cli()

export default winston
