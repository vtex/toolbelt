import chalk from 'chalk'

import { CommandError } from '../../errors'

export default async (_: any) => {
  throw new CommandError(`Converting a dev workspace into production is no longer allowed. To create a production workspace, run ${chalk.blue('vtex use <workspace> -rp')}`)
}
