import { flags as oclifFlags } from '@oclif/command'
import { CustomCommand } from '../api/oclif/CustomCommand'
import { ColorifyConstants } from '../api/constants/Colors'
import { runChatRepl } from '../modules/chat'

export default class Chat extends CustomCommand {
  static description = `Starts an interactive chat with an external agent, forwarding your prompts and displaying its responses.`

  static examples = [
    `${ColorifyConstants.COMMAND_OR_VTEX_REF('vtex chat')}`,
  ]

  static flags = {
    ...CustomCommand.globalFlags,
    'api-key': oclifFlags.string({
      description: 'Bearer token to authenticate against the agent (optional). VTEX_CHAT_API_KEY env var supported.',
      required: false,
    }),
    'send-token': oclifFlags.boolean({
      description: 'Include VTEX auth token in request context to the agent.',
      default: false,
    }),
  }

  static args = []

  async run() {
    const {
      flags: { 'api-key': apiKey, 'send-token': sendToken },
    } = this.parse(Chat)

    const resolvedApiKey = apiKey || process.env.VTEX_CHAT_API_KEY

    await runChatRepl({ apiKey: resolvedApiKey, sendToken })
  }
}
