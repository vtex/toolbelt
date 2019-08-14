import * as retry from 'async-retry'
import axios from 'axios'
import { getAccount, getToken, getWorkspace } from '../../conf'
import { region } from '../../env'
import log from '../../logger'

const SECOND = 1000
const builderHubTimeout = 2 * SECOND

const retryOpts = {
  retries: 2,
  minTimeout: 1000,
  factor: 2,
}

export class BuilderHubDatasource {
  private static builderHttp = axios.create({
    baseURL: `http://builder-hub.vtex.${region()}.vtex.io/${getAccount()}/${getWorkspace()}`,
    timeout: builderHubTimeout,
    headers: {
      Authorization: getToken(),
    },
  })

  public static builderHubTsConfig = async () => {
    const downloadTSConfig = async (_: any, tryCount: number) => {
      if (tryCount > 1) {
        log.info(`Retrying...${tryCount - 1} (get tsconfig from builder-hub)`)
      }
      try {
        const res = await BuilderHubDatasource.builderHttp.get(`/_v/builder/0/tsconfig`)
        return res.data
      } catch (err) {
        const statusMessage = err.response.status ? `: Status ${err.response.status}` : ''
        log.error(`Error fetching tsconfig from builder-hub ${statusMessage} (try: ${tryCount})`)
        throw err
      }
    }

    try {
      return retry(downloadTSConfig, retryOpts)
    } catch (e) {
      log.error('Unable to get tsconfig.json info from vtex.builder-hub.')
      return {}
    }
  }

  public static typingsInfo = async () => {
    const getTypingsInfo = async (_: any, tryCount: number) => {
      if (tryCount > 1) {
        log.info(`Retrying...${tryCount - 1} (get typings info from builder-hub)`)
      }
      try {
        const res = await BuilderHubDatasource.builderHttp.get(`/_v/builder/0/typings`)
        return res.data.typingsInfo
      } catch (err) {
        const statusMessage = err.response.status ? `: Status ${err.response.status}` : ''
        log.error(`Error fetching typings info ${statusMessage} (try: ${tryCount})`)
        throw err
      }
    }

    try {
      return retry(getTypingsInfo, retryOpts)
    } catch (e) {
      log.error('Unable to get typings info from vtex.builder-hub.')
      return {}
    }
  }
}
