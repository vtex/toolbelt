import chalk from 'chalk'
import enquirer from 'enquirer'
import { keys, prop, reject, test } from 'ramda'
import { FeatureFlag } from '../../api/modules'

import log from '../../api/logger'
import { promptConfirm } from '../../api/modules/prompts'

import * as git from './git'
import { SessionManager } from '../../api/session/SessionManager'
import { Messages } from '../../lib/constants/Messages'

// Only show these templates for VTEX e-mail users.
const VTEXInternalTemplates = FeatureFlag.getSingleton().getFeatureFlagInfo<string[]>('VTEXInternalTemplates')

interface Template {
  repository: string
  organization: string
}

const templates = FeatureFlag.getSingleton().getFeatureFlagInfo<Record<string, Template>>('templates')

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

const promptContinue = async (repoName: string, projectFolderName?: string) => {
  const proceed = await promptConfirm(
    Messages.PROMPT_CONFIRM_NEW_FOLDER(`${process.cwd()}/${projectFolderName ?? repoName}`)
  )
  if (!proceed) {
    log.info('Bye o/')
    process.exit()
  }
}

//  "VTEXInternalTemplates": [
//         "admin-example",
//         "admin-ui-example",
//         "delivery-theme",
//         "graphql-example",
//         "masterdata-graphql-guide",
//         "react-guide",
//         "render-guide",
//         "service-example",
//         "support app",
//         "payment-provider-example"
// ]

const getRepoSelected = (value: string) => {
  const options = [
    'admin-example',
    'admin-ui-example',
    'delivery-theme',
    'graphql-example',
    'masterdata-graphql-guide',
    'react-guide',
    'render-guide',
    'service-example',
    'support app',
    'payment-provider-example',
  ]

  return options[value]
}

export default async (projectFolderName?: string, preselectedProject?: string) => {
  log.debug(Messages.DEBUG_PROMPT_APP_INFO)
  log.info(Messages.INIT_HELLO_EXPLANATION())

  try {
    let org = ''
    let repo = ''

    if (!preselectedProject) {
      const { repository, organization } = templates[await promptTemplates()]

      repo = repository
      org = organization
    } else {
      repo = getRepoSelected(preselectedProject)
    }

    await promptContinue(repo, projectFolderName)

    log.info(`Cloning ${chalk.bold.cyan(repo)} from ${chalk.bold.cyan(org)}.`)
    await git.clone(repo, org, projectFolderName)
    log.info(Messages.INIT_START_DEVELOPING(projectFolderName ?? repo))
  } catch (err) {
    log.error(err.message)
    log.debug(err)
  }
}
