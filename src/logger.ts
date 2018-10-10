import * as ora from 'ora'
import * as winston from 'winston'

// TODO: Configure transport to send errors to Splunk
winston.cli()

const spinner = ora() as OraSpinner

function wrapSpinner(log) {
  return (text?: string) => {
    spinner.stop()
    log(text == null ? spinner.text : text)
    return spinner
  }
}

spinner.succeed = wrapSpinner(winston.info)
spinner.fail = wrapSpinner(winston.error)
spinner.warn = wrapSpinner(winston.warn)
spinner.info = wrapSpinner(winston.info)

function wrapLogger(logger: winston.Winston) {
  for (const member in logger) {
    if (logger[member] instanceof Function) {
      const func = logger[member]
      logger[member] = (...args : any[]) => {
        if (spinner.isSpinning) {
          spinner.clear()
        }
        func.apply(logger, args)
        if (spinner.isSpinning) {
          spinner.render()
        }
      }
    }
  }
  return logger
}

type OraSpinner = ReturnType<typeof ora> & { isSpinning: boolean }

export default wrapLogger(winston)
export {spinner}
