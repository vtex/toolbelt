import { getIOContext, IOClientOptions } from '../../utils'
import { Sponsor } from '../../../clients/sponsor'
import log from '../../../logger'
import chalk from 'chalk'
import { promptConfirm } from '../../prompts'
import setEditionCmd from '../../sponsor/setEdition'

const recommendedEdition = 'vtex.edition-store@2.x'

const getCurrEdition = async () => {
  const ctx = {
    ...getIOContext(),
    workspace: 'master',
  }
  const sponsor = new Sponsor(ctx, IOClientOptions)
  try {
    return await sponsor.getEdition()
  } catch (err) {
    if (err.response?.status !== 404) {
      log.warn(`Non-fatal error checking account edition: ${err.message}`)
    }
    return null
  }
}

const promptSwitchEdition = (currEditionId: string) => {
  log.warn(`This account is using the edition ${chalk.blue(currEditionId)}.`)
  log.warn(
    `If you are developing your store in IO, it is strongly recommended that you switch to the ${chalk.blue(
      recommendedEdition
    )}.`
  )
  log.warn(`For more information about editions, check ${chalk.blue('https://vtex.io/docs/concepts/edition-app/')}`)
  return promptConfirm(`Would you like to change the edition to ${chalk.blue(recommendedEdition)} now?`, false)
}

export async function ensureValidEdition(workspace: string) {
  const edition = await getCurrEdition()
  if (edition && edition.vendor === 'vtex' && edition.name === 'edition-business') {
    const shouldSwitch = await promptSwitchEdition(edition.id)
    if (shouldSwitch) {
      await setEditionCmd(recommendedEdition, workspace, true)
    }
  }
}
