import enquirer from 'enquirer'
import moment from 'moment'
import { switchOpen } from './modules/featureFlag/featureFlagDecider'
import { getNextFeedbackDate, saveNextFeedbackDate } from './api/conf'
import { promptConfirm } from './api/modules/prompts'

const NPSFormURL = 'https://forms.gle/CRRHn6P3x9AeaWTQ8'

const choices = {
  'In 1 day': [1, 'days'],
  'In 1 week': [1, 'weeks'],
  'In 1 month': [1, 'months'],
  Never: [3, 'months'],
}

export async function checkAndOpenNPSLink() {
  // This version should avoid questions to work well on CI
  return

  const nextFeedbackDateString = getNextFeedbackDate()

  // Start of patch to work with Cypress
  if (process.env.IN_CYPRESS) {
    return
  }
  // End of patch to work with Cypress

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
      switchOpen(NPSFormURL, { wait: false })
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
