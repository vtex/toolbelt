import { Builder, BuildResult, BuilderHubRequestOptions } from '../../lib/clients/IOClients/apps/Builder'
import { getSavedOrMostAvailableHost } from '../../host'
import { Readable } from 'stream'
import { ZlibOptions } from 'zlib'
import archiver from 'archiver'
import chalk from 'chalk'
import getStream from 'get-stream'
import logger from '../../logger'

const MB = 1000000

export interface FileToSend {
  path: string
  content: string | Readable | Buffer | NodeJS.ReadableStream
  byteSize: number
}

export type ChangeToSend = FileToSend

const getSizeString = (byteSize: number, colored = true, megaBytesintensityScale = [10, 20]) => {
  const mbSize = byteSize / MB
  const mbSizeString = mbSize.toFixed(2)
  if (!colored) {
    return `${mbSizeString}MB`
  }

  if (mbSize < megaBytesintensityScale[0]) {
    return `${chalk.bold.green(`${mbSizeString}MB`)}`
  }

  if (mbSize < megaBytesintensityScale[1]) {
    return `${chalk.bold.yellow(`${mbSizeString}MB`)}`
  }

  return `${chalk.bold.red(`${mbSizeString}MB`)}`
}

export class ProjectSizeLimitError extends Error {
  constructor(public projectByteSize: number, maxByteSize: number) {
    super(
      `This project size (${getSizeString(projectByteSize)}) is exceeding the size limit ${getSizeString(maxByteSize)} `
    )
  }
}

export class ChangeSizeLimitError extends Error {
  constructor(public changeByteSize: number, maxByteSize: number) {
    super(
      `This change size (${getSizeString(changeByteSize)}) is exceeding the size limit ${getSizeString(maxByteSize)} `
    )
  }
}

export class ProjectUploader {
  public static CHANGE_BYTESIZE_LIMIT = 50 * MB
  public static PROJECT_BYTESIZE_LIMIT = 90 * MB
  public static BYTES_PROJECT_SIZE_SCALE = [10 * MB, 20 * MB]

  public static getProjectUploader(appId: string, context: Context, clientTimeout?: number): ProjectUploader
  public static getProjectUploader(appId: string, builderHubClient: Builder): ProjectUploader
  public static getProjectUploader(appId: string, contextOrClient: Builder | Context, clientTimeout = 60000) {
    let builderHubClient: Builder
    if (contextOrClient instanceof Builder) {
      builderHubClient = contextOrClient
    } else {
      builderHubClient = Builder.createClient(contextOrClient, { timeout: clientTimeout })
    }

    const projectUploader = new ProjectUploader(appId, builderHubClient)
    return projectUploader
  }

  constructor(private appName: string, private builderHubClient: Builder) {}

  public sendToPublish(
    files: FileToSend[],
    publishTag: string,
    builderHubRequestOptions: BuilderHubRequestOptions = {}
  ) {
    return this.sendWholeProject('publish', files, builderHubRequestOptions, publishTag)
  }

  public sendToTest(files: FileToSend[], builderHubRequestOptions: BuilderHubRequestOptions = {}) {
    return this.sendWholeProject('test', files, builderHubRequestOptions)
  }

  public sendToLink(files: FileToSend[], builderHubRequestOptions: BuilderHubRequestOptions = {}) {
    return this.sendWholeProject('link', files, builderHubRequestOptions)
  }

  public sendToRelink(changes: ChangeToSend[], builderHubRequestOptions: BuilderHubRequestOptions = {}) {
    this.checkSizeLimits(changes, true)
    return this.builderHubClient.relinkApp(
      this.appName,
      changes,
      builderHubRequestOptions.params,
      builderHubRequestOptions.headers
    )
  }

  private checkSizeLimits(filesOrChanges: FileToSend[] | ChangeToSend[], isChange = false) {
    const totalByteSize = filesOrChanges.reduce((acc, file) => acc + file.byteSize, 0)
    const sizeLimit = isChange ? ProjectUploader.CHANGE_BYTESIZE_LIMIT : ProjectUploader.PROJECT_BYTESIZE_LIMIT
    if (totalByteSize > sizeLimit) {
      if (isChange) {
        throw new ChangeSizeLimitError(totalByteSize, sizeLimit)
      } else {
        throw new ProjectSizeLimitError(totalByteSize, sizeLimit)
      }
    }

    if (!isChange || isChange) {
      const logMessage = `Project size: ${getSizeString(totalByteSize)}`

      if (totalByteSize > ProjectUploader.BYTES_PROJECT_SIZE_SCALE[0]) {
        logger.warn(logMessage)
      } else {
        logger.info(logMessage)
      }
    }
  }

  // prettier-ignore
  private async sendWholeProject( operation: 'link' | 'test', files: FileToSend[], builderHubRequestOptions: BuilderHubRequestOptions ): Promise<BuildResult>
  // prettier-ignore
  private async sendWholeProject(operation: 'publish', files: FileToSend[], builderHubRequestOptions: BuilderHubRequestOptions, publishTag: string): Promise<BuildResult>
  // prettier-ignore
  private async sendWholeProject(operation: 'link' | 'publish' | 'test', files: FileToSend[], builderHubRequestOptions: BuilderHubRequestOptions, publishTag?: string) {
    this.checkSizeLimits(files)
    this.checkForManifest(files)

    logger.info('Compressing project files...')
    const zipFile = await this.compressFilesOnMemory(files)
    logger.info(`Compressed project size: ${getSizeString(zipFile.byteLength, false)}`)

    const stickyHint = await this.getBuilderHubSticky()
    const builderHubResolvingOpts = {
      sticky: true,
      stickyHint,
    }

    if (operation === 'link') {
      return this.builderHubClient.linkApp(this.appName, zipFile, builderHubResolvingOpts, builderHubRequestOptions.params, builderHubRequestOptions.headers)
    }

    if (operation === 'publish') {
      return this.builderHubClient.publishApp(this.appName, zipFile, { ...builderHubResolvingOpts, tag: publishTag }, builderHubRequestOptions.params)
    }

    return this.builderHubClient.testApp(this.appName, zipFile, builderHubResolvingOpts, builderHubRequestOptions.params)
  }

  private checkForManifest(files: FileToSend[]) {
    const indexOfManifest = files.findIndex(({ path }) => path === 'manifest.json')
    if (indexOfManifest === -1) {
      throw new Error('No manifest.json file found in files.')
    }
  }

  private getBuilderHubSticky(hostsToTry = 3, timeout = 1000) {
    return getSavedOrMostAvailableHost(this.appName, this.builderHubClient, hostsToTry, timeout)
  }

  private compressFilesOnMemory = async (files: FileToSend[], zlibOptions: ZlibOptions = {}) => {
    const zip = archiver('zip', { zlib: zlibOptions })

    zip.on('error', (err: any) => {
      throw err
    })

    files.forEach(({ content, path }) => zip.append(content, { name: path }))

    const [zipContent] = await Promise.all([getStream.buffer(zip), zip.finalize()])
    return zipContent as Buffer
  }
}
