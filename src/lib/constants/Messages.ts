import chalk from 'chalk'
import { ColorifyConstants } from '../../api/constants/Colors'

export const Messages = {
  USE_SUCCESS: (workspace: string, account: string) =>
    `${chalk.bold('Workspace change:')} You are now using the workspace ${ColorifyConstants.ID(
      workspace
    )} on account ${ColorifyConstants.ID(account)}.\n`,
  CREATE_MISSING_WORKSPACE_NAME: () =>
    `You need to pick a name for the new workspace. Run ${ColorifyConstants.ID(
      'vtex workspace create [WORKSPACENAME]'
    )}. You can name it using your name with a number, for example ${ColorifyConstants.ID(
      `vtex workspace create johndoe01`
    )}`,
}
