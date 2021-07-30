import { retryPolicies, WebClient } from '@slack/web-api'
import { slackBotToken } from '../../env'
import log from '../../logger'

/**
 * Toolbelt Messenger Slack bot client
 * You can find more information about this application on: https://api.slack.com/apps/A029R8XC6US/general
 */
const web = new WebClient(slackBotToken(), {
  maxRequestConcurrency: 10,
  retryConfig: retryPolicies.fiveRetriesInFiveMinutes,
})

export class SlackMessenger {
  public async sendNewAdminAppMessage(appId: string, publisher: string) {
    try {
      await web.chat.postMessage({
        text: `New Admin App published: ${appId} by ${publisher}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*New Admin App published* \n ${appId} \n by ${publisher}`,
            },
          },
        ],
        channel: 'admin-apps',
      })

      log.info(`We have let the admin team know about the ${appId} publishing`)
    } catch (error) {
      log.warn(`We were unable to let the admin team know about the ${appId} publishing`)
    }
  }
}
