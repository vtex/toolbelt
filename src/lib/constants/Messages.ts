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
  UPDATE_TOOLBELT: () =>
    `To update, you must use the same method you used to install. As the following examples:` +
    `\n\n` +
    `• If you installed using ${ColorifyConstants.COMMAND_OR_VTEX_REF(
      `yarn`
    )}, update running ${ColorifyConstants.COMMAND_OR_VTEX_REF(`yarn global add vtex`)}.` +
    `\n\n` +
    `• If you installed using our new method there is in alpha-version, update running ${ColorifyConstants.COMMAND_OR_VTEX_REF(
      `vtex autoupdate`
    )}.`,
}
