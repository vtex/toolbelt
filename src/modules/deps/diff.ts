import chalk from 'chalk'
import { SessionManager } from '../../api/session/SessionManager'
import { matchedDepsDiffTable } from '../utils'
import { getCleanDependencies } from './utils'

export default async (workspace1 = 'master', workspace2?: string) => {
  workspace2 = workspace2 ?? SessionManager.getSingleton().workspace

  const deps1 = await getCleanDependencies(workspace1)
  const deps2 = await getCleanDependencies(workspace2)
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
