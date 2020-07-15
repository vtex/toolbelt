import chalk from 'chalk'
import { createRegistryClient } from '../../api/clients/IOClients/infra/Registry'
import { ErrorReport } from '../../api/error/ErrorReport'
import { ManifestEditor, ManifestValidator } from '../../api/manifest'
import { SessionManager } from '../../api/session/SessionManager'
import { TelemetryCollector } from '../../lib/telemetry/TelemetryCollector'
import { parseLocator } from '../../api/locator'
import log from '../../api/logger'
import { returnToPreviousAccount, switchAccount } from '../auth/switch'
import { promptConfirm } from '../../api/modules/prompts'

let originalAccount
let originalWorkspace

const switchToVendorMessage = (vendor: string): string => {
  return `You are trying to deprecate this app in an account that differs from the indicated vendor. Do you want to deprecate in account ${chalk.blue(
    vendor
  )}?`
}

const promptDeprecate = (appsList: string[]) =>
  promptConfirm(
    `Are you sure you want to deprecate app${appsList.length > 1 ? 's' : ''} ${chalk.green(appsList.join(', '))}?`
  )

const deprecateApp = async (app: string): Promise<void> => {
  const { vendor, name, version } = parseLocator(app)
  const session = SessionManager.getSingleton()
  if (vendor !== session.account) {
    const canSwitchToVendor = await promptConfirm(switchToVendorMessage(vendor))
    if (!canSwitchToVendor) {
      return
    }
    await switchAccount(vendor, {})
  }
  const context = { account: vendor, workspace: 'master', authToken: session.token }
  const registry = createRegistryClient(context)
  return registry.deprecateApp(`${vendor}.${name}`, version)
}

const prepareAndDeprecateApps = async (appsList: string[]): Promise<any> => {
  for (const app of appsList) {
    ManifestValidator.validateApp(app)
    log.debug('Starting to deprecate app:', app)

    try {
      // eslint-disable-next-line no-await-in-loop
      await deprecateApp(app)
      log.info('Successfully deprecated', app)
    } catch (e) {
      const errReport = ErrorReport.create({ originalError: e })

      if (e.response && e.response.status && e.response.status === 404) {
        log.error(`Error deprecating ${app}. App not found`)
        errReport.logErrorForUser({ coreLogLevelDefault: 'debug' })
        TelemetryCollector.getCollector().registerError(errReport)
      } else if (e.message && e.response.statusText) {
        log.error(`Error deprecating ${app}. ${e.message}. ${e.response.statusText}`)
        errReport.logErrorForUser({ coreLogLevelDefault: 'debug' })
        TelemetryCollector.getCollector().registerError(errReport)
        return returnToPreviousAccount({ previousAccount: originalAccount, previousWorkspace: originalWorkspace })
      } else {
        // eslint-disable-next-line no-await-in-loop
        await returnToPreviousAccount({ previousAccount: originalAccount, previousWorkspace: originalWorkspace })
        throw errReport
      }
    }
  }

  await returnToPreviousAccount({ previousAccount: originalAccount, previousWorkspace: originalWorkspace })
}

export default async (optionalApps: string[], options) => {
  const preConfirm = options.y || options.yes

  const { account, workspace } = SessionManager.getSingleton()
  originalAccount = account
  originalWorkspace = workspace

  const appsList = optionalApps.length > 0 ? optionalApps : [(await ManifestEditor.getManifestEditor()).appLocator]

  if (!preConfirm && !(await promptDeprecate(appsList))) {
    return
  }

  log.debug(`Deprecating app${appsList.length > 1 ? 's' : ''}: ${appsList.join(', ')}`)
  return prepareAndDeprecateApps(appsList)
}
