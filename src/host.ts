import retry from 'async-retry'
import moment from 'moment'
import { map, reduce } from 'ramda'
import { Builder } from './api/clients/IOClients/apps/Builder'
import { getStickyHost, hasStickyHost, saveStickyHost } from './conf'
import { BuilderHubTimeoutError } from './api/error/errors'
import log from './api/logger'

const TTL_SAVED_HOST_HOURS = 0

const NOT_AVAILABLE = {
  hostname: undefined,
  score: -1000,
  stickyHint: undefined,
}

const AVAILABILITY_RETRY_OPTS = {
  retries: 2,
  minTimeout: 1000,
  factor: 2,
}

const withTimeout = (promise: Promise<any>, timeout: number) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new BuilderHubTimeoutError(`Timeout of ${timeout}ms exceeded`)), timeout)
    promise
      .then(res => {
        clearTimeout(timer)
        resolve(res)
      })
      .catch(err => {
        clearTimeout(timer)
        reject(err)
      })
  })
}

const mapAvailability = (appId: string, builder: Builder, timeout: number) => {
  return map(async (hintIdx: number) => {
    const getAvailabilityWithTimeout = () => {
      const availabilityP = builder.availability(appId, hintIdx)
      return withTimeout(availabilityP, timeout)
    }
    try {
      const response = (await retry(getAvailabilityWithTimeout, AVAILABILITY_RETRY_OPTS)) as AvailabilityResponse
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

const highestAvailability = reduce((acc: any, current: any) => {
  const { score: scoreAcc } = acc
  const { score: scoreCurrent } = current
  return scoreCurrent > scoreAcc ? current : acc
}, NOT_AVAILABLE)

const getMostAvailableHost = async (
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

export const getSavedOrMostAvailableHost = async (
  appId: string,
  builder: Builder,
  nHosts: number,
  timeout: number
): Promise<string> => {
  const [appName] = appId.split('@')
  if (hasStickyHost(appName)) {
    log.debug(`Found sticky host saved locally`)
    const { stickyHost, lastUpdated } = getStickyHost(appName)
    const timeElapsed = moment.duration(moment().diff(lastUpdated))
    if (timeElapsed.asHours() <= TTL_SAVED_HOST_HOURS) {
      return stickyHost
    }
    log.debug(`Saved sticky host has expired`)
  }
  log.debug(`Finding a new sticky host`)
  const newStickyHost = await getMostAvailableHost(appId, builder, nHosts, timeout)
  if (newStickyHost) {
    saveStickyHost(appName, newStickyHost)
  }
  return newStickyHost
}
