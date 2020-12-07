import chalk from 'chalk'
import { ColorifyConstants } from '../../api/constants/Colors'
import { FeatureFlag } from '../../modules/featureFlag/featureFlag'

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
    )}.\n`,
  UPDATE_TOOLBELT_NPM: () =>
    `• If you installed using ${ColorifyConstants.COMMAND_OR_VTEX_REF(
      `yarn`
    )}, update running ${ColorifyConstants.COMMAND_OR_VTEX_REF(`yarn global add vtex`)}.`,
  UPDATE_TOOLBELT_BREW: () =>
    `• If you installed using ${ColorifyConstants.COMMAND_OR_VTEX_REF(
      `brew`
    )}, update running ${ColorifyConstants.COMMAND_OR_VTEX_REF(`brew upgrade vtex/vtex`)}.`,
  UPDATE_TOOLBELT_STANDALONE: () =>
    `• If you installed using ${ColorifyConstants.COMMAND_OR_VTEX_REF(
      `AWS Standalone`
    )}, update running ${ColorifyConstants.COMMAND_OR_VTEX_REF(`vtex autoupdate`)}.`,
  UPDATE_TOOLBELT_CHOCOLATEY: () =>
    `• If you installed using ${ColorifyConstants.COMMAND_OR_VTEX_REF(
      `chocolatey`
    )}, update running ${ColorifyConstants.COMMAND_OR_VTEX_REF(`choco upgrade vtex`)}.`,
  UPDATE_FROM_DEPRECATED_BREW: () =>
    `• If you installed using ${ColorifyConstants.COMMAND_OR_VTEX_REF(
      `brew`
    )}, update running ${ColorifyConstants.COMMAND_OR_VTEX_REF(`brew unlink vtex && brew install vtex/vtex`)}.`,
  UPDATE_FROM_DEPRECATED_STANDALONE: () =>
    `• If you installed using ${ColorifyConstants.COMMAND_OR_VTEX_REF(`AWS Standalone`)}, update running:
    ${ColorifyConstants.COMMAND_OR_VTEX_REF(
      `curl https://vtex-toolbelt-test.s3.us-east-2.amazonaws.com/uninstall.sh | sh`
    )}
    ${ColorifyConstants.COMMAND_OR_VTEX_REF(
      `curl https://vtex-toolbelt-test.s3.us-east-2.amazonaws.com/install.sh | sh`
    )}`,
  UPDATE_FROM_DEPRECATED_CHOCOLATEY: () =>
    `• If you installed using ${ColorifyConstants.COMMAND_OR_VTEX_REF(`chocolatey`)}, update running:
    ${ColorifyConstants.COMMAND_OR_VTEX_REF(`choco uninstall vtex`)}.
    ${ColorifyConstants.COMMAND_OR_VTEX_REF(`choco install vtex`)}.`,
}

export function updateMessageSwitch() {
  const allMessages: string[] = []
  allMessages.push(Messages.UPDATE_TOOLBELT_NPM())

  const flagOSVersionMessage: boolean = FeatureFlag.getSingleton().getFeatureFlagInfo<boolean>(
    'FEATURE_FLAG_OS_VERSION_MESSAGE'
  )

  if (flagOSVersionMessage) {
    switch (process.platform) {
      case 'darwin':
        allMessages.push(Messages.UPDATE_TOOLBELT_BREW())
        break
      case 'linux':
        allMessages.push(Messages.UPDATE_TOOLBELT_STANDALONE())
        break
      case 'win32':
        allMessages.push(Messages.UPDATE_TOOLBELT_CHOCOLATEY())
        break
      default:
        break
    }
  }

  return allMessages
}

export function updateFromDeprecatedMessageSwitch() {
  const allMessages: string[] = []
  allMessages.push(Messages.UPDATE_TOOLBELT_NPM())

  const flagOSVersionMessage: boolean = FeatureFlag.getSingleton().getFeatureFlagInfo<boolean>(
    'FEATURE_FLAG_OS_VERSION_MESSAGE'
  )

  if (flagOSVersionMessage) {
    switch (process.platform) {
      case 'darwin':
        allMessages.push(Messages.UPDATE_FROM_DEPRECATED_BREW())
        break
      case 'linux':
        allMessages.push(Messages.UPDATE_FROM_DEPRECATED_STANDALONE())
        break
      case 'win32':
        allMessages.push(Messages.UPDATE_FROM_DEPRECATED_CHOCOLATEY())
        break
      default:
        break
    }
  }

  return allMessages
}
