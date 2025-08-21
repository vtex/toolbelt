import { flags as oclifFlags } from '@oclif/command'
import { CustomCommand } from '../api/oclif/CustomCommand'
import { ColorifyConstants } from '../api/constants/Colors'
import { runChatRepl } from '../modules/chat'

export default class Chat extends CustomCommand {
  static description = `Starts an interactive chat with an external agent, forwarding your prompts and displaying its responses.`

  static examples = [
    `${ColorifyConstants.COMMAND_OR_VTEX_REF('vtex chat')} --endpoint https://agent.example.com --path /api/chat`,
  ]

  static flags = {
    ...CustomCommand.globalFlags,
    endpoint: oclifFlags.string({
      char: 'e',
      description: 'Base URL of the agent service. Can also be set via VTEX_CHAT_ENDPOINT env var.',
      required: false,
    }),
    path: oclifFlags.string({
      char: 'p',
      description: 'Relative path of the chat endpoint (e.g. /api/chat). Can be set via VTEX_CHAT_PATH env var.',
      default: '/api/chat',
    }),
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
      flags: { endpoint, path, 'api-key': apiKey, 'send-token': sendToken },
    } = this.parse(Chat)

    const resolvedEndpoint = endpoint || process.env.VTEX_CHAT_ENDPOINT
    const resolvedPath = path || process.env.VTEX_CHAT_PATH || '/api/chat'
    const resolvedApiKey = apiKey || process.env.VTEX_CHAT_API_KEY

    if (!resolvedEndpoint) {
      this.error(`Missing agent endpoint. Provide --endpoint or set VTEX_CHAT_ENDPOINT.`, { exit: 2 })
      return
    }

    await runChatRepl({ endpoint: resolvedEndpoint, path: resolvedPath, apiKey: resolvedApiKey, sendToken })
  }
}
