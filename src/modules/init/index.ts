import chalk from 'chalk'
import enquirer from 'enquirer'
import { keys, prop, reject, test } from 'ramda'

import log from '../../api/logger'
import { promptConfirm } from '../../api/modules/prompts'

import * as git from './git'
import { SessionManager } from '../../api/session/SessionManager'

const VTEX_APPS = 'vtex-apps'

const VTEXInternalTemplates = [
  // Only show these templates for VTEX e-mail users.
  'graphql-example',
  'payment-provider-example',
  'admin-example',
  'delivery-theme',
  'service-example',
  'render-guide',
  'masterdata-graphql-guide',
  'support app',
  'react-guide',
]

interface Template {
  repository: string
  organization: string
}

const templates: Record<string, Template> = {
  'graphql-example': {
    repository: 'graphql-example',
    organization: VTEX_APPS,
  },
  'payment-provider-example': {
    repository: 'payment-provider-example',
    organization: VTEX_APPS,
  },
  'admin-example': {
    repository: 'admin-example',
    organization: VTEX_APPS,
  },
  store: {
    repository: 'minimum-boilerplate-theme',
    organization: VTEX_APPS,
  },
  'delivery-theme': {
    repository: 'delivery-theme',
    organization: VTEX_APPS,
  },
  'service-example': {
    repository: 'service-example',
    organization: VTEX_APPS,
  },
  'render-guide': {
    repository: 'render-guide',
    organization: VTEX_APPS,
  },
  'masterdata-graphql-guide': {
    repository: 'masterdata-graphql-guide',
    organization: VTEX_APPS,
  },
  'edition app': {
    repository: 'edition-hello',
    organization: VTEX_APPS,
  },
  'support app': {
    repository: 'hello-support',
    organization: VTEX_APPS,
  },
  'react-guide': {
    repository: 'react-app-template',
    organization: VTEX_APPS,
  },
  'checkout-ui-settings': {
    repository: 'checkout-ui-settings',
    organization: VTEX_APPS,
  },
}

const getTemplates = () =>
  // Return all templates if user's e-mail is `...@vtex...`.
  // Otherwise filter the VTEX internal templates.
  test(/@vtex\./, SessionManager.getSingleton().userLogged)
    ? keys(templates)
    : reject(x => VTEXInternalTemplates.indexOf(x) >= 0, keys(templates))

const promptTemplates = async (): Promise<string> => {
  const cancel = 'Cancel'
  const chosen = prop<string>(
    'service',
    await enquirer.prompt({
      name: 'service',
      message: 'Choose where do you want to start from',
      type: 'select',
      choices: [...getTemplates(), cancel],
    })
  )
  if (chosen === cancel) {
    log.info('Bye o/')
    return process.exit()
  }
  return chosen
}

const promptContinue = async (repoName: string) => {
  const proceed = await promptConfirm(
    `You are about to create the new folder ${process.cwd()}/${repoName}. Do you want to continue?`
  )
  if (!proceed) {
    log.info('Bye o/')
    process.exit()
  }
}

export default async () => {
  log.debug('Prompting for app info')
  log.info('Hello! I will help you generate basic files and folders for your app.')
  try {
    const { repository: repo, organization: org } = templates[await promptTemplates()]
    await promptContinue(repo)
    log.info(`Cloning ${chalk.bold.cyan(repo)} from ${chalk.bold.cyan(org)}.`)
    await git.clone(repo, org)
    log.info(`Run ${chalk.bold.green(`cd ${repo}`)} and ${chalk.bold.green('vtex link')} to start developing!`)
  } catch (err) {
    log.error(err.message)
    log.debug(err)
  }
}
