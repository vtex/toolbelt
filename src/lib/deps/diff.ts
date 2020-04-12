import chalk from 'chalk'

import { getAccount, getToken } from '../../utils/conf'
import { dummyLogger } from '../../clients/dummyLogger'
import userAgent from '../../utils/user-agent'
import * as env from '../../utils/env'
import { getCleanDependencies } from '../../utils/deps'
import { matchedDepsDiffTable } from '../../utils/utils'

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

export async function workspaceDepsDiff(workspace1: string, workspace2: string) {
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
