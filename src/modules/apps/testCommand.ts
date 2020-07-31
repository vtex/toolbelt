import retry from 'async-retry'
import chalk from 'chalk'
import { concat, map, prop } from 'ramda'
import { ManifestEditor } from '../../api'
import { Builder } from '../../api/clients/IOClients/apps/Builder'
import { ErrorKinds } from '../../api/error/ErrorKinds'
import { ErrorReport } from '../../api/error/ErrorReport'
import { createPathToFileObject } from '../../api/files/ProjectFilesManager'
import { YarnFilesManager } from '../../api/files/YarnFilesManager'
import log from '../../api/logger'
import { getAppRoot } from '../../api/manifest/ManifestUtil'
import { listLocalFiles } from '../../api/modules/apps/file'
import { ProjectUploader } from '../../api/modules/apps/ProjectUploader'
import { listenBuild } from '../../api/modules/build'
import { validateAppAction } from '../../api/modules/utils'
import { fixPinnedDependencies, PinnedDeps } from '../../api/pinnedDependencies'
import { BatchStream } from '../../api/typings'
import { runYarnIfPathExists } from '../utils'

const buildersToRunLocalYarn = ['react', 'node']
const RETRY_OPTS_TEST = {
  retries: 2,
  minTimeout: 1000,
  factor: 2,
}

const performTest = async (
  root: string,
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

export default async options => {
  await validateAppAction('test')
  const unsafe = !!(options.unsafe || options.u)

  const root = getAppRoot()
  const manifest = await ManifestEditor.getManifestEditor()
  await manifest.writeSchema()
  const appId = manifest.appLocator

  const builder = Builder.createClient({}, { timeout: 60000 })
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
      log.error(`App build failed. Waiting for changes...`)
    },
  }

  const onBuild = async () => {
    process.exit()
  }

  log.info(`Testing app ${appId}`)

  const extraData = { linkConfig: null }
  try {
    const buildTrigger = performTest.bind(this, root, projectUploader, extraData, unsafe)
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
        throw ErrorReport.createAndMaybeRegisterOnTelemetry({
          kind: ErrorKinds.FLOW_ISSUE_ERROR,
          originalError: new Error(
            `Please use a dev workspace to test apps. Create one with (${chalk.blue(
              'vtex use <workspace> -rp'
            )}) to be able to test apps`
          ),
        })
      }
    }
    throw e
  }
}
