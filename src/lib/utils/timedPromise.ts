import { ErrorReport } from '../error/ErrorReport'
import { hrTimeToMs } from './hrTimeToMs'

export function timedPromise<T>(
  promise: Promise<T>,
  timeout: number,
  timeoutErrorHandler: (timeout: number) => Error | ErrorReport | any
): Promise<T> {
  return new Promise((resolve, reject) => {
    const initTime = process.hrtime()
    const timer = setTimeout(() => {
      const timePast = hrTimeToMs(process.hrtime(initTime))
      reject(timeoutErrorHandler(timePast))
    }, timeout)

    promise.then(
      (val: T) => {
        resolve(val)
        clearTimeout(timer)
      },
      (err: any) => {
        reject(err)
        clearTimeout(timer)
      }
    )
  })
}
