import { BuildResult } from '@vtex/api'
import retry from 'async-retry'
import chalk from 'chalk'
import { region } from '../../api/env'
import { createPathToFileObject } from '../../api/files/ProjectFilesManager'
import { toAppLocator } from '../../api/locator'
import log from '../../api/logger'
import { ManifestEditor, getAppRoot } from '../../api/manifest'
import { listLocalFiles } from '../../api/modules/apps/file'
import { ProjectUploader } from '../../api/modules/apps/ProjectUploader'
import { listenBuild } from '../../api/modules/build'
import { promptConfirm } from '../../api/modules/prompts'
import {
  checkBuilderHubMessage,
  continueAfterReactTermsAndConditions,
  showBuilderHubMessage,
} from '../../api/modules/utils'
import { SessionManager } from '../../api/session/SessionManager'
import * as conf from '../../api/conf'
import { returnToPreviousAccount, switchAccount } from '../../api/modules/auth/switch'
import { runYarnIfPathExists } from '../utils'

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
    const session = SessionManager.getSingleton()
    const manifest = await ManifestEditor.getManifestEditor()

    const builderHubMessage = await checkBuilderHubMessage('publish')
    if (builderHubMessage != null) {
      await showBuilderHubMessage(builderHubMessage.message, builderHubMessage.prompt, manifest)
    }

    const { account: previousAccount, workspace: previousWorkspace } = session

    if (manifest.vendor !== session.account) {
      const switchToVendorMsg = `You are trying to publish this app in an account that differs from the indicated vendor. Do you want to publish in account ${chalk.blue(
        manifest.vendor
      )}?`
      const canSwitchToVendor = await promptConfirm(switchToVendorMsg)
      if (!canSwitchToVendor) {
        return
      }
      await switchAccount(manifest.vendor, {})
    }

    const pubTag = tag || automaticTag(manifest.version)
    const appId = toAppLocator(manifest)
    const context = { account: manifest.vendor, workspace, region: region(), authToken: session.token }
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

      if (manifest.builders?.docs) {
        log.info(
          `Your app documentation will be available at: ${chalk.yellowBright(`https://vtex.io/docs/app/${appId}`)}`
        )
      }
    } catch (e) {
      log.error(`Failed to publish ${appId}`)
      process.exit(1)
    }

    await returnToPreviousAccount({ previousAccount, previousWorkspace })
  }

  return { publishApp, publishApps }
}

export default async (path: string, options, pipeline: boolean) => {
  log.debug(`Starting to publish app in ${conf.getEnvironment()}`)

  const { account } = SessionManager.getSingleton()
  const manifest = await ManifestEditor.getManifestEditor()

  const mustContinue = await continueAfterReactTermsAndConditions(manifest)
  if (!mustContinue) {
    process.exit(1)
  }

  const versionMsg = chalk.bold.yellow(manifest.version)
  const appNameMsg = chalk.bold.yellow(`${manifest.vendor}.${manifest.name}`)

  const yesFlag = options.y || options.yes

  if (!pipeline && !yesFlag) {
    const confirmVersion = await promptConfirm(
      `Are you sure that you want to release version ${chalk.bold(`${versionMsg} of ${appNameMsg}?`)}`,
      false
    )

    if (!confirmVersion) {
      process.exit(1)
    }
  }

  if (yesFlag && manifest.vendor !== account) {
    log.error(`When using the 'yes' flag, you need to be logged in to the same account as your app’s vendor.`)
    process.exit(1)
  }

  const workspace = options.w || options.workspace

  if (workspace && manifest.vendor !== account) {
    log.error(`When using the 'workspace' flag, you need to be logged in to the same account as your app’s vendor.`)
    process.exit(1)
  }

  const root = getAppRoot()
  path = path || root
  const force = options.f || options.force

  // Always run yarn locally for some builders
  buildersToRunLocalYarn.map(runYarnIfPathExists)

  const { publishApps } = publisher(workspace)
  await publishApps(path, options.tag, force)
}
