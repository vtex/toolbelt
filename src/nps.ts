import enquirer from 'enquirer'
import moment from 'moment'
import open from 'open'
import opn from 'opn'
import { ToolbeltConfig } from './api/clients/IOClients/apps/ToolbeltConfig'

import { getNextFeedbackDate, saveNextFeedbackDate } from './api/conf'
import { ErrorReport } from './api/error/ErrorReport'
import { promptConfirm } from './api/modules/prompts'
import { ErrorKinds } from './api/error/ErrorKinds'

const NPSFormURL = 'https://forms.gle/CRRHn6P3x9AeaWTQ8'

const choices = {
  'In 1 day': [1, 'days'],
  'In 1 week': [1, 'weeks'],
  'In 1 month': [1, 'months'],
  Never: [3, 'months'],
}

export async function checkAndOpenNPSLink() {
  const nextFeedbackDateString = getNextFeedbackDate()

  if (!nextFeedbackDateString) {
    // If the user is starting to use the tool, wait 1 week to ask for feedback.
    saveNextFeedbackDate(
      moment()
        .add(1, 'weeks')
        .toISOString()
    )
    return
  }

  const nextFeedbackDate = moment(nextFeedbackDateString)

  if (moment() > nextFeedbackDate) {
    const shouldOpenFeedbackForm = await promptConfirm(
      `Help us evolve VTEX IO! Can you fill in our feedback form?`,
      true
    )
    if (shouldOpenFeedbackForm) {
      // Ask for feedback again in 3 months.
      saveNextFeedbackDate(
        moment()
          .add(3, 'months')
          .toISOString()
      )

      try {
        const configClient = ToolbeltConfig.createClient()
        const { featureFlags } = await configClient.getGlobalConfig()

        if (featureFlags.FEATURE_FLAG_NEW_OPEN_PACKAGE) {
          open(NPSFormURL, { wait: false })
        } else {
          opn(NPSFormURL, { wait: false })
        }
      } catch (err) {
        ErrorReport.createAndMaybeRegisterOnTelemetry({
          kind: ErrorKinds.TOOLBELT_CONFIG_FEATURE_FLAG_ERROR,
          originalError: err,
        }).logErrorForUser({ coreLogLevelDefault: 'debug' })
      }
    } else {
      // @ts-ignore
      let { remindChoice } = await enquirer.prompt({
        name: 'remindChoice',
        message: 'When would you like to be reminded?',
        type: 'select',
        choices: Object.keys(choices),
      })

      const [n, unit] = choices[remindChoice]
      remindChoice = moment()
        .add(n, unit)
        .toISOString()
      saveNextFeedbackDate(remindChoice)
    }
  }
}
