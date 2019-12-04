import chalk from 'chalk'
import * as enquirer from 'enquirer'
import { keys, prop, reject, test } from 'ramda'

import { getLogin } from '../../conf'
import log from '../../logger'
import { promptConfirm } from '../prompts'

import * as git from './git'

const VTEXInternalTemplates = [
  // Only show these templates for VTEX e-mail users.
  'graphql-example',
  'service-example',
  'react-guide',
  'masterdata-graphql-guide',
]

const templates = {
  'graphql-example': 'graphql-example',
  'admin-example': 'admin-example',
  'store-theme': 'store-theme',
  'delivery-theme': 'delivery-theme',
  'service-example': 'service-example',
  'render-guide': 'render-guide',
  'masterdata-graphql-guide': 'masterdata-graphql-guide',
  'support app': 'hello-support',
  'react-guide': 'react-app-template',
}

const getTemplates = () =>
  // Return all templates if user's e-mail is `...@vtex...`.
  // Otherwise filter the VTEX internal templates.
  test(/\@vtex\./, getLogin()) ? keys(templates) : reject(x => VTEXInternalTemplates.indexOf(x) >= 0, keys(templates))

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
    const repo = templates[await promptTemplates()]
    await promptContinue(repo)
    log.info(`Cloning https://vtex-apps/${repo}.git`)
    await git.clone(repo)
    log.info(`Run ${chalk.bold.green(`cd ${repo}`)} and ${chalk.bold.green('vtex link')} to start developing!`)
  } catch (err) {
    log.error(err.message)
    log.debug(err)
  }
}
