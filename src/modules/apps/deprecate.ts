import {head, tail, prepend, prop} from 'ramda'
import chalk from 'chalk'
import * as inquirer from 'inquirer'
import * as Bluebird from 'bluebird'

import log from '../../logger'
import {parseArgs} from './utils'
import {getManifest, validateApp} from '../../manifest'
import {toAppLocator, parseLocator} from './../../locator'
import {createClients} from '../../clients'
import {getAccount} from '../../conf'

const promptDeprecate = (appsList: string[]): Bluebird<boolean> =>
inquirer.prompt({
  type: 'confirm',
  name: 'confirm',
  message: `Are you sure you want to deprecate app` + (appsList.length > 1 ? 's' : '') + ` ${chalk.green(appsList.join(', '))}?`,
})
.then<boolean>(prop('confirm'))

const deprecateApps = async (appsList: string[], optionAccount: string, registry: any): Promise<void> => {
  if (appsList.length === 0) {
    return
  }
  const app = await validateApp(head(appsList))
  const {vendor, name, version} = parseLocator(app)
  try {
    log.debug('Starting to deprecate app:', app)
    await registry.deprecateApp(`${vendor}.${name}`, version)
    log.info('Successfully deprecated', app)
  } catch (e) {
    if (e.response.status === 404) {
      log.error(`Error deprecating ${app}. App not found in registry ${chalk.green(optionAccount)}`)
      log.info('Please use --public to use the public registry or --registry to specify one')
    } else {
      log.error(`Error deprecating ${app}. ${e.message}. ${e.response.statusText}`)
    }
  }
  await deprecateApps(tail(appsList), optionAccount, registry)
}

export default async (optionalApp: string, options) => {
  const preConfirm = options.y || options.yes
  const optionRegistry = options.r || options.registry
  const optionPublic = options.p || options.public
  const optionAccount = optionPublic ? 'smartcheckout' : optionRegistry ? optionRegistry : getAccount()
  const context = {account: optionAccount, workspace: 'master'}
  const {registry} = createClients(context)
  const appsList = prepend(optionalApp || toAppLocator(await getManifest()), parseArgs(options._))

  if (!preConfirm && !await promptDeprecate(appsList)) {
    throw new Error('User cancelled')
  }
  log.debug('Deprecating app' + (appsList.length > 1 ? 's' : '') + `: ${appsList.join(', ')}`)
  return deprecateApps(appsList, optionAccount, registry)
}
