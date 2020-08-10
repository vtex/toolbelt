import chalk from 'chalk'
import { Sponsor } from '../../../clients/IOClients/apps/Sponsor'
import { ErrorKinds } from '../../../error/ErrorKinds'
import { ErrorReport } from '../../../error/ErrorReport'
import log from '../../../logger'
import { promptConfirm } from '../../../modules/prompts'
import { setEdition } from '../../../modules/sponsor'

const recommendedEdition = 'vtex.edition-store@2.x'

const getCurrEdition = async () => {
  const sponsor = Sponsor.createClient({ workspace: 'master' })
  try {
    return await sponsor.getEdition()
  } catch (err) {
    if (err.response?.status !== 404) {
      ErrorReport.createAndMaybeRegisterOnTelemetry({
        kind: ErrorKinds.EDITION_REQUEST_ERROR,
        originalError: err,
      })

      log.debug(`Non-fatal error checking account edition: ${err.message}`)
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
      await setEdition(recommendedEdition, workspace, true)
    }
  }
}
