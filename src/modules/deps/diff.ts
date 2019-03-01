import chalk from 'chalk'
import { getAccount, getToken, getWorkspace } from '../../conf'
import * as env from '../../env'
import userAgent from '../../user-agent'
import { getCleanDependencies, matchedDepsDiffTable } from './utils'

const context = (workspace: string) => {
  // Returns default context with variable workspace name.
  return {
    account: getAccount(),
    authToken: getToken(),
    production: false,
    region: env.region(),
    route: {
      id: '',
      params: {},
    },
    userAgent,
    workspace,
  }
}

export default async (workspace1 = 'master', workspace2 = getWorkspace()) => {
  const deps1 = await getCleanDependencies(context(workspace1))
  const deps2 = await getCleanDependencies(context(workspace2))
  const diffTable = matchedDepsDiffTable(workspace1, workspace2, deps1, deps2)
  if (diffTable.length === 1) {
    return console.log(`${chalk.yellow('Dependency diff')} between ${chalk.yellow(workspace1)} and ${chalk.yellow(workspace2)} is empty\n`)
  }
  console.log(`${chalk.yellow('Dependency diff')} between ${chalk.yellow(workspace1)} and ${chalk.yellow(workspace2)}`)
  console.log(diffTable.toString())
}
