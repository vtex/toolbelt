import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../../oclif/CustomCommand'
import testE2e from '../../modules/apps/e2e'

export default class E2E extends CustomCommand {
  static description = 'Start a development session for this app'

  static examples = []

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
    report: oclifFlags.string({
      char: 'r',
      description: 'Check the results and state of a previously started test given its ID',
    }),
    workspace: oclifFlags.boolean({ char: 'w', description: "Test workspace's apps", default: false }),
    token: oclifFlags.boolean({
      char: 't',
      description:
        "[Not recommended] Send your personal authorization token to your test session so it's available while running the tests. It can be dangerous because exposes the token via 'authToken' environment variable",
      default: false,
    }),
  }

  static args = []

  async run() {
    const { flags } = this.parse(E2E)

    testE2e(flags)
  }
}
