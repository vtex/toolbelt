import * as enquirer from 'enquirer'
import * as moment from 'moment'
import * as opn from 'opn'
import { prop, keys } from 'ramda'

import { getNextFeedbackDate, saveNextFeedbackDate } from './conf'
import { promptConfirm } from './modules/prompts'

const NEVER = 'NEVER'
const NPSFormURL = 'https://forms.gle/CRRHn6P3x9AeaWTQ8'

const choices = {
  'In 1 day': [1, 'days'],
  'In 1 week': [1, 'weeks'],
  'In 1 month': [1, 'months'],
  Never: NEVER,
}

export default async function checkAndOpenNPSLink() {
  const nextFeedbackDateString = getNextFeedbackDate()

  if (nextFeedbackDateString === NEVER) {
    return
  }
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
    const shouldOpenFeedbackForm = await promptConfirm(`Would you please fill in the feedback form?`, false)
    if (shouldOpenFeedbackForm) {
      // Ask for feedback again in 3 months.
      saveNextFeedbackDate(
        moment()
          .add(3, 'months')
          .toISOString()
      )
      opn(NPSFormURL, { wait: false })
    } else {
      let remindChoice = await enquirer
        .prompt({
          name: 'choice',
          message: 'When would you like to be reminded?',
          type: 'select',
          choices: keys(choices),
        })
        .then(prop('choice'))

      if (remindChoice !== NEVER) {
        const [n, unit] = choices[remindChoice]
        remindChoice = moment()
          .add(n, unit)
          .toISOString()
      }
      saveNextFeedbackDate(remindChoice)
    }
  }
}
