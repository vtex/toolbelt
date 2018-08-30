import { Builder } from '@vtex/api'
import { map, reduce } from 'ramda'

import { BuilderHubTimeoutError } from './errors'
import log from './logger'

const NOT_AVAILABLE = {
  hostname: undefined,
  score: -1000,
  stickyHint: undefined
}

const withTimeout = (promise: Promise<any>, timeout: number) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new BuilderHubTimeoutError(`Timeout of ${timeout}ms exceeded`)),
      timeout,
    )
    promise
      .then((res) => {
        clearTimeout(timer)
        resolve(res)
      })
      .catch((err) => {
        clearTimeout(timer)
        reject(err)
      })
  })
}

const mapAvailability = (appId: string, builder: Builder, timeout: number) => {
  return map(async (hintIdx) => {
    try {
      const availabilityP = builder.availability(appId, hintIdx)
      const response = await withTimeout(availabilityP, timeout) as AvailabilityResponse
      const { host: stickyHint, hostname, score } = response
      log.debug(`Retrieved availability score ${score} from host ${hostname}`)

      return { hostname, score, stickyHint }
    } catch (e) {
      e.code === 'builder_hub_timeout'
        ? log.debug(`Request to host at position ${hintIdx} timed out after ${timeout}ms`)
        : log.debug(`Unable to retrieve availability from host at position ${hintIdx}`)

      return NOT_AVAILABLE
    }
  })
}

const highestAvailability = reduce((acc, current) => {
  const { score: scoreAcc } = acc
  const { score: scoreCurrent } = current
  return scoreCurrent > scoreAcc ? current : acc
}, NOT_AVAILABLE)

export const getMostAvailableHost = async (
  appId: string,
  builder: Builder,
  nHosts: number,
  timeout: number
): Promise<string> => {
  const hintsIdxArray = Array.from(new Array(nHosts), (_, idx) => idx)
  const getAvailability = mapAvailability(appId, builder, timeout)

  log.debug(`Trying to retrieve builder-hub availability from ${nHosts} hosts`)
  const availabilityArray = await Promise.all(getAvailability(hintsIdxArray))
  const { hostname, score, stickyHint } = highestAvailability(availabilityArray)

  stickyHint
    ? log.debug(`Selected host ${hostname} with availability score ${score}`)
    : log.debug(`Unable to select host a priori, will use default options`)

  return stickyHint
}
