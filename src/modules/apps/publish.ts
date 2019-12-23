import { BuildResult } from '@vtex/api'
import * as retry from 'async-retry'
import chalk from 'chalk'
import * as ora from 'ora'
import { isEmpty, map } from 'ramda'
import * as conf from '../../conf'
import { region } from '../../env'
import { UserCancelledError } from '../../errors'
import { toAppLocator } from '../../locator'
import log from '../../logger'
import { getAppRoot } from '../../manifest'
import switchAccount from '../auth/switch'
import { listenBuild } from '../build'
import { promptConfirm } from '../prompts'
import { runYarnIfPathExists, switchToPreviousAccount } from '../utils'
import { listLocalFiles } from './file'
import { ProjectUploader } from './ProjectUploader'
import { checkBuilderHubMessage, pathToFileObject, showBuilderHubMessage } from './utils'
import { ManifestEditor } from '../../lib/manifest'

const root = getAppRoot()
const buildersToRunLocalYarn = ['node', 'react']

const automaticTag = (version: string): string => (version.indexOf('-') > 0 ? null : 'latest')

const publisher = (workspace: string = 'master') => {
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
      const filesWithContent = map(pathToFileObject(appRoot), paths)
      if (tryCount === 1) {
        log.debug('Sending files:', '\n' + paths.join('\n'))
      }
      if (tryCount > 1) {
        log.info(`Retrying...${tryCount - 1}`)
      }

      try {
        return await projectUploader.sendToPublish(filesWithContent, tag, { skipSemVerEnsure: force })
      } catch (err) {
        const response = err.response
        const status = response.status
        const data = response && response.data
        const message = data.message
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
    return await retry(publish, retryOpts)
  }

  const publishApps = async (path: string, tag: string, force: boolean): Promise<void | never> => {
    const previousConf = conf.getAll() // Store previous configuration in memory

    const manifest = await ManifestEditor.getManifestEditor()
    const account = conf.getAccount()

    const builderHubMessage = await checkBuilderHubMessage('publish')
    if (!isEmpty(builderHubMessage)) {
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

    const oraMessage = ora(`Publishing ${appId} ...`)
    const spinner = log.level === 'debug' ? oraMessage.info() : oraMessage.start()
    try {
      const senders = ['vtex.builder-hub', 'apps']
      const { response } = await listenBuild(appId, () => publishApp(path, pubTag, force, projectUploader), {
        waitCompletion: true,
        context,
        senders,
      })
      if (response.code !== 'build.accepted') {
        spinner.warn(
          `${appId} was published successfully, but you should update your builder hub to the latest version.`
        )
      } else {
        spinner.succeed(`${appId} was published successfully!`)
      }
    } catch (e) {
      spinner.fail(`Failed to publish ${appId}`)
    }

    await switchToPreviousAccount(previousConf)

    Promise.resolve()
  }

  return { publishApp, publishApps }
}

export default async (path: string, options) => {
  log.debug(`Starting to publish app in ${conf.getEnvironment()}`)

  const response = await promptConfirm(
    chalk.yellow.bold(
      `Starting January 2, 2020, the 'vtex publish' command will change its behavior and more steps will be added to the publishing process. Read more about this change here: https://vtex.io/docs/releases/2019-week-47-48-49-50-51/publish-command. Acknowledged?`
    ),
    false
  )
  if (!response) {
    process.exit(1)
  }

  path = path || root
  const workspace = options.w || options.workspace
  const force = options.f || options.force

  // Always run yarn locally for some builders
  map(runYarnIfPathExists, buildersToRunLocalYarn)

  const { publishApps } = publisher(workspace)
  await publishApps(path, options.tag, force)
}
