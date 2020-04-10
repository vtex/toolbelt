import retry from 'async-retry'
import chalk from 'chalk'
import { concat, map, prop } from 'ramda'

import { createClients } from '../../clients'
import { ProjectUploader } from '../../utils/ProjectUploader'
import { YarnFilesManager } from '../../utils/files/YarnFilesManager'
import { listLocalFiles } from '../../utils/file'
import { createPathToFileObject } from '../../utils/files/ProjectFilesManager'
import { validateAppAction, runYarnIfPathExists } from '../../utils/utils'
import { PinnedDeps, fixPinnedDependencies } from '../../utils/pinnedDependencies'
import { listenBuild } from '../../utils/build'
import { getAppRoot, getManifest, writeManifestSchema } from '../../utils/manifest'
import { toAppLocator } from '../../utils/locator'
import { getAccount, getWorkspace, getEnvironment } from '../../utils/conf'
import { CommandError } from '../../utils/errors'
import log from '../../utils/logger'

const root = getAppRoot()
const buildersToRunLocalYarn = ['react', 'node']
const RETRY_OPTS_TEST = {
  retries: 2,
  minTimeout: 1000,
  factor: 2,
}

const performTest = async (
  projectUploader: ProjectUploader,
  extraData: { yarnFilesManager: YarnFilesManager },
  unsafe: boolean
): Promise<void> => {
  const yarnFilesManager = await YarnFilesManager.createFilesManager(root)
  extraData.yarnFilesManager = yarnFilesManager
  yarnFilesManager.logSymlinkedDependencies()

  const testApp = async (bail: any, tryCount: number) => {
    const test = true
    const [localFiles, linkedFiles] = await Promise.all([
      listLocalFiles(root, test).then(paths => map(createPathToFileObject(root), paths)),
      yarnFilesManager.getYarnLinkedFiles(),
    ])
    const filesWithContent = concat(localFiles, linkedFiles) as BatchStream[]

    if (tryCount === 1) {
      const linkedFilesInfo = linkedFiles.length ? `(${linkedFiles.length} from linked node modules)` : ''
      log.info(`Sending ${filesWithContent.length} file${filesWithContent.length > 1 ? 's' : ''} ${linkedFilesInfo}`)
      log.debug('Sending files')
      filesWithContent.forEach(p => log.debug(p.path))
    }

    if (tryCount > 1) {
      log.info(`Retrying...${tryCount - 1}`)
    }

    try {
      const { code } = await projectUploader.sendToTest(filesWithContent, { tsErrorsAsWarnings: unsafe })
      if (code !== 'build.accepted') {
        bail(new Error('Please, update your builder-hub to the latest version!'))
      }
    } catch (err) {
      const { response } = err
      const { status } = response
      const data = response?.data
      const { message } = data
      const statusMessage = status ? `: Status ${status}` : ''
      log.error(`Error testing app${statusMessage} (try: ${tryCount})`)
      if (message) {
        log.error(`Message: ${message}`)
      }
      if (status && status < 500) {
        return
      }
      throw err
    }
  }
  await retry(testApp, RETRY_OPTS_TEST)
}

export async function testCommand(unsafe: boolean) {
  await validateAppAction('test')
  const manifest = await getManifest()
  try {
    await writeManifestSchema()
  } catch (e) {
    log.debug('Failed to write schema on manifest.')
  }

  const appId = toAppLocator(manifest)
  const context = { account: getAccount(), workspace: getWorkspace(), environment: getEnvironment() }
  const { builder } = createClients(context, { timeout: 60000 })
  const projectUploader = ProjectUploader.getProjectUploader(appId, builder)

  try {
    const pinnedDeps: PinnedDeps = await builder.getPinnedDependencies()
    await fixPinnedDependencies(pinnedDeps, buildersToRunLocalYarn, manifest.builders)
  } catch (e) {
    log.info('Failed to check for pinned dependencies')
  }
  // Always run yarn locally for some builders
  map(runYarnIfPathExists, buildersToRunLocalYarn)

  const onError = {
    // eslint-disable-next-line @typescript-eslint/camelcase
    build_failed: () => {
      log.error('App build failed. Waiting for changes...')
    },
  }

  const onBuild = async () => {
    process.exit()
  }

  log.info(`Testing app ${appId}`)

  const extraData = { linkConfig: null }
  try {
    const buildTrigger = performTest.bind(this, projectUploader, extraData, unsafe)
    const [subject] = appId.split('@')
    await listenBuild(subject, buildTrigger, { waitCompletion: false, onBuild, onError }).then(prop('unlisten'))
  } catch (e) {
    if (e.response) {
      const { data } = e.response
      if (data.code === 'routing_error' && /app_not_found.*vtex\.builder-hub/.test(data.message)) {
        return log.error(
          'Please install vtex.builder-hub in your account to enable app testing (vtex install vtex.builder-hub)'
        )
      }

      if (data.code === 'link_on_production') {
        throw new CommandError(
          `Please use a dev workspace to test apps. Create one with (${chalk.blue(
            'vtex use <workspace> -rp'
          )}) to be able to test apps`
        )
      }
    }
    throw e
  }
}
