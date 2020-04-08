import { flags as oclifFlags } from '@oclif/command'
import chalk from 'chalk'
import { compose, equals, head, path } from 'ramda'

import { apps, billing } from '../../clients'
import { UserCancelledError } from '../../errors'
import { ManifestEditor, ManifestValidator } from '../../lib/manifest'
import log from '../../logger'
import { promptConfirm } from '../../lib/prompts'
import { optionsFormatter } from '../../lib/apps/utils'
import { CustomCommand } from '../../lib/CustomCommand'

const { installApp } = billing
const { installApp: legacyInstallApp } = apps

const isError = (errorCode: number) => compose(equals(errorCode), path(['response', 'status']))
const isForbiddenError = isError(403)
const isNotFoundError = isError(404)
const hasErrorMessage = path(['response', 'data', 'message'])

const logGraphQLErrorMessage = e => {
  log.error('Installation failed!')
  log.error(e.message)
}

const promptPolicies = async () => {
  return promptConfirm('Do you accept all the Terms?')
}

const checkBillingOptions = async (app: string, billingOptions: BillingOptions, force: boolean) => {
  log.warn(
    `${chalk.blue(app)} is a ${
      billingOptions.free ? chalk.green('free') : chalk.red('paid')
    } app. To install it, you need to accept the following Terms:\n\n${optionsFormatter(billingOptions)}\n`
  )
  const confirm = await promptPolicies()
  if (!confirm) {
    throw new UserCancelledError()
  }

  log.info('Starting to install app with accepted Terms')
  await installApp(app, true, force)
  log.debug('Installed after accepted terms')
}

export const prepareInstall = async (appsList: string[], force: boolean): Promise<void> => {
  for (const app of appsList) {
    ManifestValidator.validateApp(app)
    try {
      log.debug('Starting to install app', app)
      if (app === 'vtex.billing' || head(app.split('@')) === 'vtex.billing') {
        // eslint-disable-next-line no-await-in-loop
        await legacyInstallApp(app)
      } else {
        // eslint-disable-next-line no-await-in-loop
        const { code, billingOptions } = await installApp(app, false, force)
        switch (code) {
          case 'installed_from_own_registry':
            log.debug('Installed from own registry')
            break
          case 'public_app':
            log.debug('Installed from public registry')
            break
          case 'installed_by_previous_purchase':
            log.debug('Installed from previous purchase')
            break
          case 'installed_free':
            log.debug('Free app')
            break
          case 'check_terms':
            if (!billingOptions) {
              throw new Error('Failed to get billing options')
            }
            // eslint-disable-next-line no-await-in-loop
            await checkBillingOptions(app, JSON.parse(billingOptions), force)
        }
      }
      log.info(`Installed app ${chalk.green(app)} successfully`)
    } catch (e) {
      if (e.name === UserCancelledError.name) {
        throw new UserCancelledError()
      }
      if (isNotFoundError(e)) {
        log.warn(
          `Billing app not found in current workspace. Please install it with ${chalk.green(
            'vtex install vtex.billing'
          )}`
        )
      } else if (isForbiddenError(e)) {
        log.error(
          "You do not have permission to install apps. Please check your VTEX IO 'Install App' resource access in Account Management"
        )
      } else if (hasErrorMessage(e)) {
        log.error(e.response.data.message)
      } else {
        switch (e.message) {
          case 'no_buy_app_license':
            log.error(
              `You do not have permission to purchase apps. Please check your VTEX IO 'Buy Apps' resource access in Account Managament`
            )
            break
          case 'area_unavailable':
            log.error('Unfortunately, app purchases are not yet available in your region')
            break
          default:
            logGraphQLErrorMessage(e)
        }
      }
      log.warn(`The following app was not installed: ${app}`)
    }
  }
}

export default class Install extends CustomCommand {
  static description = 'Install an app (defaults to the app in the current directory)'

  static examples = [
    'vtex apps:install',
    'vtex install',
    'vtex apps:install vtex.service-example@0.x',
    'vtex apps:install vtex.service-example@0.0.1',
  ]

  static aliases = ['install']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
    force: oclifFlags.boolean({
      char: 'f',
      description: 'Install app without checking for route conflicts',
      default: false,
    }),
  }

  static args = [{ name: 'appId' }]

  async run() {
    const { args, flags } = this.parse(Install)

    const { force } = flags
    const app = args.appId || (await ManifestEditor.getManifestEditor()).appLocator
    const appsList = [app]
    log.debug(`Installing app${appsList.length > 1 ? 's' : ''}: ${appsList.join(', ')}`)
    return prepareInstall(appsList, force)
  }
}
