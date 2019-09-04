import * as archiver from 'archiver'
import axios, { AxiosInstance } from 'axios'
import * as ora from 'ora'
import { map } from 'ramda'

import { publicEndpoint } from '../../env'
import { BuildFailError } from '../../errors'
import { toAppLocator } from '../../locator'
import log from '../../logger'
import { listenBuild } from '../utils'
import { listLocalFiles } from './file'
import { pathToFileObject } from './utils'

const routes = {
  Publish: '_v/publish',
}

class LegacyBuilder {
  private http: AxiosInstance

  constructor(opts: any) {
    const { account, workspace } = opts
    this.http = axios.create({
      baseURL: `http://${workspace}--${account}.${publicEndpoint()}`,
      headers: {
        'User-Agent': 'vtex.toolbelt',
      },
      validateStatus: status => (status >= 200 && status < 300) || status === 304,
    })
  }

  public prePublishApp = (files: File[]) => {
    if (!(files[0] && files[0].path && files[0].content)) {
      throw new Error(
        'Argument files must be an array of {path, content}, where content can be a String, a Buffer or a ReadableStream.'
      )
    }
    const indexOfManifest = files.findIndex(({ path }) => path === 'manifest.json')
    if (indexOfManifest === -1) {
      throw new Error('No manifest.json file found in files.')
    }
    const archive = archiver('zip')
    files.forEach(({ content, path }) => archive.append(content, { name: path }))
    archive.finalize()
    return this.http.post(routes.Publish, archive, {
      params: {},
      headers: { 'Content-Type': 'application/octet-stream' },
    })
  }
}

interface File {
  path: string
  content: any
}

export const legacyPublisher = (account: string, workspace: string = 'master') => {
  const context = { account, workspace }

  const prePublish = async (files, _, unlistenBuild) => {
    const builder = new LegacyBuilder(context)
    const response = await builder.prePublishApp(files)
    if (response.status === 200) {
      unlistenBuild(response)
      return
    }

    return response
  }

  const publishApp = async (appRoot: string, tag: string, manifest: Manifest): Promise<void> => {
    const spinner = ora('Publishing legacy app...').start()
    const appId = toAppLocator(manifest)
    const options = { context, timeout: null }

    try {
      const paths = await listLocalFiles(appRoot)
      const filesWithContent = map(pathToFileObject(appRoot), paths)
      log.debug('Sending files:', '\n' + paths.join('\n'))
      await listenBuild(appId, unlistenBuild => prePublish(filesWithContent, tag, unlistenBuild), options)
    } catch (e) {
      if (e instanceof BuildFailError) {
        log.error(e.message)
        return
      }
      if (e.response && e.response.status >= 400 && e.response.status < 500) {
        log.error(e.response.data.message)
        return
      }
      throw e
    } finally {
      spinner.stop()
    }
    log.info(`Published app ${appId} successfully at ${account}`)
  }

  return { legacyPublishApp: publishApp }
}
