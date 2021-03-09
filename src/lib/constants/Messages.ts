import chalk from 'chalk'
import { ColorifyConstants } from '../../api/constants/Colors'
import { FeatureFlag } from '../../api/modules/featureFlag'

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
  INIT_HELLO_EXPLANATION: () => `Hello! I will help you generate basic files and folders for your app.`,
  INIT_START_DEVELOPING: (folder: string) =>
    `Run ${ColorifyConstants.COMMAND_OR_VTEX_REF(`cd ${folder}`)} and ${ColorifyConstants.COMMAND_OR_VTEX_REF(
      'vtex link'
    )} to start developing!`,
  PROMPT_CONFIRM_NEW_FOLDER: (folder: string) =>
    `You are about to create the new folder ${folder}. Do you want to continue?`,
  DEBUG_DOWNLOAD_TEMPLATE_URL: (url: string) => `We will try to download the template app from this URL: ${url}`,
  DEBUG_PROMPT_APP_INFO: () => `Prompting for app info`,
  ERROR_COULD_NOT_DETERMINE_DEFAULT_BRANCH: (org: string, repo: string) =>
    `We could not determine the default branch for repo ${org}/${repo}. Please try again.`,
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
