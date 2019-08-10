import * as winston from 'winston'
import { isVerbose } from './utils'

const logger = winston.createLogger({
  level: 'debug',
  transports: [
    new winston.transports.Console({
      level: isVerbose ? 'debug' : 'info',
    }),
  ],
})

export default logger
