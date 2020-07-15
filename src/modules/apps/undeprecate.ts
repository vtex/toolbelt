import chalk from 'chalk'
import { createRegistryClient } from '../../api/clients/IOClients/infra/Registry'
import { ErrorReport } from '../../api/error/ErrorReport'
import { ManifestEditor, ManifestValidator } from '../../api/manifest'
import { SessionManager } from '../../api/session/SessionManager'
import { parseLocator } from '../../api/locator'
import log from '../../api/logger'
import { returnToPreviousAccount, switchAccount } from '../auth/switch'
import { promptConfirm } from '../../api/modules/prompts'
import { TelemetryCollector } from '../../lib/telemetry/TelemetryCollector'

let originalAccount
let originalWorkspace

const switchToVendorMessage = (vendor: string): string => {
  return `You are trying to undeprecate this app in an account that differs from the indicated vendor. Do you want to undeprecate in account ${chalk.blue(
    vendor
  )}?`
}

const promptUndeprecate = (appsList: string[]) =>
  promptConfirm(
    `Are you sure you want to undeprecate app${appsList.length > 1 ? 's' : ''} ${chalk.green(appsList.join(', '))}?`
  )

const undeprecateApp = async (app: string): Promise<void> => {
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
  return registry.undeprecateApp(`${vendor}.${name}`, version)
}

const prepareUndeprecate = async (appsList: string[]): Promise<void> => {
  for (const app of appsList) {
    ManifestValidator.validateApp(app)
    try {
      log.debug('Starting to undeprecate app:', app)
      // eslint-disable-next-line no-await-in-loop
      await undeprecateApp(app)
      log.info('Successfully undeprecated', app)
    } catch (e) {
      const errReport = ErrorReport.create({ originalError: e })

      if (e.response && e.response.status && e.response.status === 404) {
        log.error(`Error undeprecating ${app}. App not found.`)
        errReport.logErrorForUser({ coreLogLevelDefault: 'debug' })
        TelemetryCollector.getCollector().registerError(errReport)
      } else if (e.message && e.response.statusText) {
        log.error(`Error undeprecating ${app}. ${e.message}. ${e.response.statusText}`)
        errReport.logErrorForUser({ coreLogLevelDefault: 'debug' })
        TelemetryCollector.getCollector().registerError(errReport)
        // eslint-disable-next-line no-await-in-loop
        await returnToPreviousAccount({ previousAccount: originalAccount, previousWorkspace: originalWorkspace })
        return
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

  if (!preConfirm && !(await promptUndeprecate(appsList))) {
    return
  }
  log.debug(`Undeprecating app ${appsList.length > 1 ? 's' : ''} : ${appsList.join(', ')}`)
  return prepareUndeprecate(appsList)
}
