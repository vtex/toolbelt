import { BuildResult } from '@vtex/api'
import retry from 'async-retry'
import chalk from 'chalk'

import * as conf from '../utils/conf'
import { region } from '../utils/env'
import { UserCancelledError } from '../utils/errors'
import { toAppLocator } from '../utils/locator'
import log from '../utils/logger'
import { getAppRoot } from '../utils/manifest'
import { ProjectUploader } from '../utils/ProjectUploader'
import { listLocalFiles } from '../utils/file'
import { createPathToFileObject } from '../utils/files/ProjectFilesManager'
import { ManifestEditor } from '../utils/manifest/ManifestEditor'
import {
  checkBuilderHubMessage,
  showBuilderHubMessage,
  switchToPreviousAccount,
  runYarnIfPathExists,
} from '../utils/utils'
import { promptConfirm } from '../utils/prompts'
import { switchAccount } from './switch'
import { listenBuild } from '../utils/build'

const root = getAppRoot()
const buildersToRunLocalYarn = ['node', 'react']

const automaticTag = (version: string): string => (version.indexOf('-') > 0 ? null : 'latest')

const publisher = (workspace = 'master') => {
  const publishApp = async (
    appRoot: string,
    tag: string,
    force: boolean,
    projectUploader: ProjectUploader
  ): Promise<BuildResult> => {
    const paths = await listLocalFiles(appRoot)
    const retryOpts = {
      retries: 2,
      minTimeout: 1000,
      factor: 2,
    }
    const publish = async (_, tryCount) => {
      const filesWithContent = paths.map(createPathToFileObject(appRoot))
      if (tryCount === 1) {
        log.debug('Sending files:', `\n${paths.join('\n')}`)
      }
      if (tryCount > 1) {
        log.info(`Retrying...${tryCount - 1}`)
      }

      try {
        return await projectUploader.sendToPublish(filesWithContent, tag, { skipSemVerEnsure: force })
      } catch (err) {
        const { response } = err
        const { status } = response
        const data = response?.data
        const { message } = data
        const statusMessage = status ? `: Status ${status}` : ''
        log.error(`Error publishing app${statusMessage} (try: ${tryCount})`)
        if (message) {
          log.error(`Message: ${message}`)
        }
        if (status && status < 500) {
          return
        }
        throw err
      }
    }
    return retry(publish, retryOpts)
  }

  const publishApps = async (path: string, tag: string, force: boolean): Promise<void | never> => {
    const previousConf = conf.getAll() // Store previous configuration in memory

    const manifest = await ManifestEditor.getManifestEditor()
    const account = conf.getAccount()

    const builderHubMessage = await checkBuilderHubMessage('publish')
    if (builderHubMessage != null) {
      await showBuilderHubMessage(builderHubMessage.message, builderHubMessage.prompt, manifest)
    }

    if (manifest.vendor !== account) {
      const switchToVendorMsg = `You are trying to publish this app in an account that differs from the indicated vendor. Do you want to publish in account ${chalk.blue(
        manifest.vendor
      )}?`
      const canSwitchToVendor = await promptConfirm(switchToVendorMsg)
      if (!canSwitchToVendor) {
        throw new UserCancelledError()
      }
      await switchAccount(manifest.vendor, {})
    }

    const pubTag = tag || automaticTag(manifest.version)
    const appId = toAppLocator(manifest)
    const context = { account: manifest.vendor, workspace, region: region(), authToken: conf.getToken() }
    const projectUploader = ProjectUploader.getProjectUploader(appId, context)

    try {
      const senders = ['vtex.builder-hub', 'apps']
      await listenBuild(appId, () => publishApp(path, pubTag, force, projectUploader), {
        waitCompletion: true,
        context,
        senders,
      })

      log.info(`${appId} was published successfully!`)
      log.info(`You can deploy it with: ${chalk.blueBright(`vtex deploy ${appId}`)}`)
    } catch (e) {
      log.error(`Failed to publish ${appId}`)
    }

    await switchToPreviousAccount(previousConf)

    Promise.resolve()
  }

  return { publishApp, publishApps }
}

export async function appsPublish(pathArg: string, yesFlag: boolean, workspace: string, force: boolean, tag: string) {
  log.debug(`Starting to publish app in ${conf.getEnvironment()}`)

  const account = conf.getAccount()
  const manifest = await ManifestEditor.getManifestEditor()
  const versionMsg = chalk.bold.yellow(manifest.version)
  const appNameMsg = chalk.bold.yellow(`${manifest.vendor}.${manifest.name}`)

  if (!yesFlag) {
    const confirmVersion = await promptConfirm(
      `Are you sure that you want to release version ${chalk.bold(`${versionMsg} of ${appNameMsg}?`)}`,
      false
    )

    if (!confirmVersion) {
      process.exit(1)
    }
  }

  if (yesFlag && manifest.vendor !== account) {
    log.error("When using the 'yes' flag, you need to be logged in to the same account as your app’s vendor.")
    process.exit(1)
  }

  const path = pathArg || root

  if (workspace && manifest.vendor !== account) {
    log.error("When using the 'workspace' flag, you need to be logged in to the same account as your app’s vendor.")
    process.exit(1)
  }

  // Always run yarn locally for some builders
  buildersToRunLocalYarn.map(runYarnIfPathExists)

  const { publishApps } = publisher(workspace)
  await publishApps(path, tag, force)
}
