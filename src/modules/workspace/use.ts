import chalk from 'chalk'

import { workspaces } from '../../clients'
import { getAccount, saveWorkspace, getLastUsedWorkspace } from '../../conf'
import { CommandError } from '../../errors'
import log from '../../logger'
import { promptConfirm } from '../prompts'
import createCmd from './create'
import resetWks from './reset'
import { Sponsor } from '../../clients/sponsor'
import { getIOContext, IOClientOptions } from '../utils'
import setEditionCmd from '../sponsor/setEdition'

const promptWorkspaceCreation = (name: string) => {
  console.log(chalk.blue('!'), `Workspace ${chalk.green(name)} doesn't exist`)
  return promptConfirm('Do you wish to create it?')
}

const promptWorkspaceProductionFlag = () => promptConfirm('Should the workspace be in production mode?', false)

const shouldPromptProduction = (production: boolean): boolean => {
  return production === undefined || production === null
}

const recommendedEdition = "vtex.edition-store@2.x"

const getCurrEdition = () => {
  const sponsor = new Sponsor(getIOContext(), IOClientOptions)
  return sponsor.getEdition()
}

const promptSwitchEdition = (currEditionId: string) => {
  log.warn(`This account is using the edition ${chalk.blue(currEditionId)}.`)
  log.warn(`If you are developing your store in IO, it is strongly recommended that you switch to the ${chalk.blue(recommendedEdition)}.`)
  log.warn(`For more information, visit ${chalk.blue('https://some.doc/about/edition/store')}`)
  return promptConfirm(`Would you like to change the edition to ${chalk.blue(recommendedEdition)} now?`, false)
}

export default async (name: string, options?) => {
  const reset = options ? options.r || options.reset : null
  let production = options ? options.p || options.production : null
  let confirm
  const accountName = getAccount()

  if (name === '-') {
    name = getLastUsedWorkspace()
    if (name == null) {
      throw new CommandError('No last used workspace was found')
    }
  }

  try {
    await workspaces.get(accountName, name)
  } catch (err) {
    if (err.response && err.response.status === 404) {
      confirm = await promptWorkspaceCreation(name)
      if (!confirm) {
        return
      }
      if (shouldPromptProduction(production)) {
        production = await promptWorkspaceProductionFlag()
      }
      await createCmd(name, { production })
    } else {
      throw err
    }
  }
  await saveWorkspace(name)

  if (reset && !confirm) {
    await resetWks(name, { production })
  }
  log.info(`You're now using the workspace ${chalk.green(name)} on account ${chalk.blue(accountName)}!`)

  const edition = await getCurrEdition()
  if (edition && edition.vendor === 'vtex' && edition.name === 'edition-business') {
    const shouldSwitch = await promptSwitchEdition(edition.id)
    if (shouldSwitch) {
      await setEditionCmd(recommendedEdition)
    }
  }
}
