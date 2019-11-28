import { Builder } from '@vtex/api'
import * as retry from 'async-retry'
import * as bluebird from 'bluebird'
import chalk from 'chalk'
import { concat, map, prop, toPairs } from 'ramda'
import { createClients } from '../../clients'
import { getAccount, getEnvironment, getWorkspace } from '../../conf'
import { CommandError } from '../../errors'
import { getSavedOrMostAvailableHost } from '../../host'
import { ManifestEditor } from '../../lib/manifest'
import { toAppLocator } from '../../locator'
import log from '../../logger'
import { getAppRoot } from '../../manifest'
import { listenBuild } from '../build'
import { fixPinnedDependencies, runYarnIfPathExists } from '../utils'
import { createLinkConfig, getLinkedFiles, listLocalFiles } from './file'
import { pathToFileObject, validateAppAction } from './utils'

const root = getAppRoot()
const AVAILABILITY_TIMEOUT = 1000
const N_HOSTS = 3
const buildersToRunLocalYarn = ['react', 'node']
const RETRY_OPTS_TEST = {
  retries: 2,
  minTimeout: 1000,
  factor: 2,
}

const performTest = async (
  appId: string,
  builder: Builder,
  extraData: { linkConfig: LinkConfig },
  unsafe: boolean
): Promise<void> => {
  const linkConfig = await createLinkConfig(root)

  extraData.linkConfig = linkConfig

  const usedDeps = toPairs(linkConfig.metadata)
  if (usedDeps.length) {
    const plural = usedDeps.length > 1
    log.info(`The following local dependenc${plural ? 'ies are' : 'y is'} linked to your app:`)
    usedDeps.forEach(([dep, path]) => log.info(`${dep} (from: ${path})`))
    log.info(
      `If you don\'t want ${plural ? 'them' : 'it'} to be used by your vtex app, please unlink ${
        plural ? 'them' : 'it'
      }`
    )
  }

  const testApp = async (bail: any, tryCount: number) => {
    const test = true
    const [localFiles, linkedFiles] = await Promise.all([
      listLocalFiles(root, test).then(paths => map(pathToFileObject(root), paths)),
      getLinkedFiles(linkConfig),
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

    const stickyHint = await getSavedOrMostAvailableHost(appId, builder, N_HOSTS, AVAILABILITY_TIMEOUT)
    const testOptions = { sticky: true, stickyHint }
    try {
      const { code } = await builder.testApp(appId, filesWithContent, testOptions, { tsErrorsAsWarnings: unsafe })
      if (code !== 'build.accepted') {
        bail(new Error('Please, update your builder-hub to the latest version!'))
      }
    } catch (err) {
      const response = err.response
      const status = response.status
      const data = response && response.data
      const message = data.message
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
  const manifest = new ManifestEditor()

  const appId = toAppLocator(manifest)
  const context = { account: getAccount(), workspace: getWorkspace(), environment: getEnvironment() }
  const { builder } = createClients(context, { timeout: 60000 })

  try {
    const aux = await builder.getPinnedDependencies()
    const pinnedDeps: Map<string, string> = new Map(Object.entries(aux))
    await bluebird.map(buildersToRunLocalYarn, fixPinnedDependencies(pinnedDeps), { concurrency: 1 })
  } catch (e) {
    log.info('Failed to check for pinned dependencies')
  }
  // Always run yarn locally for some builders
  map(runYarnIfPathExists, buildersToRunLocalYarn)

  const onError = {
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
    const buildTrigger = performTest.bind(this, appId, builder, extraData, unsafe)
    const [subject] = appId.split('@')
    await listenBuild(subject, buildTrigger, { waitCompletion: false, onBuild, onError }).then(prop('unlisten'))
  } catch (e) {
    if (e.response) {
      const { data } = e.response
      if (data.code === 'routing_error' && /app_not_found.*vtex\.builder\-hub/.test(data.message)) {
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
