import chalk from 'chalk'

import { getAccount, getToken, getWorkspace } from '../../../conf'
import { dummyLogger } from '../../../clients/dummyLogger'
import { CustomCommand } from '../../../lib/CustomCommand'
import { matchedDepsDiffTable } from '../../../lib/utils'
import userAgent from '../../../user-agent'
import * as env from '../../../env'
import { getCleanDependencies } from '../../../lib/deps/utils'

const context = (workspace: string) => {
  // Returns default context with variable workspace name.
  return {
    account: getAccount(),
    authToken: getToken(),
    production: false,
    product: '',
    region: env.region(),
    route: {
      id: '',
      params: {},
    },
    userAgent,
    workspace,
    requestId: '',
    operationId: '',
    logger: dummyLogger,
    platform: '',
  }
}

export default class DepsDiff extends CustomCommand {
  static description = 'Diff between workspace dependencies'

  static examples = []

  static flags = {}

  static args = [
    { name: 'workspace1', required: false, default: getWorkspace() },
    { name: 'workspace2', required: false, default: 'master' },
  ]

  async run() {
    const { args } = this.parse(DepsDiff)
    const workspace1 = args.workspace2
    const workspace2 = args.workspace1

    const deps1 = await getCleanDependencies(context(workspace1))
    const deps2 = await getCleanDependencies(context(workspace2))
    const diffTable = matchedDepsDiffTable(workspace1, workspace2, deps1, deps2)
    if (diffTable.length === 1) {
      return console.log(
        `${chalk.yellow('Dependency diff')} between ${chalk.yellow(workspace1)} and ${chalk.yellow(
          workspace2
        )} is empty\n`
      )
    }
    console.log(`${chalk.yellow('Dependency diff')} between ${chalk.yellow(workspace1)} and ${chalk.yellow(workspace2)}`)
    console.log(diffTable.toString())
  }
}
