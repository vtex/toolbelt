import chalk from 'chalk'
import { formatHyperlink } from '../../lib/utils/Messages'
import { ColorifyConstants } from './Colors'

export const Messages = {
  PROMOTE_INIT: 'Promoting workspace',
  PROMOTE_CHECK_WORKSPACE: (workspace: string, url: string) => `${chalk.bold(
    `The workspace ${ColorifyConstants.ID(workspace)} is about to be promoted,`
  )} to be sure if this is the one you want to promote, check on the link below, please.\n
  🖥️  ${ColorifyConstants.ID(workspace)} workspace
  See at: ${ColorifyConstants.URL_INTERACTIVE(url)}\n`,
  PROMOTE_PROMPT_CONFIRM: (workspace: string) =>
    `Do you want to promote ${ColorifyConstants.ID(workspace)} to master? ${chalk.dim(
      `Doing so, the work you did locally will be taken to production.`
    )}`,
  PROMOTE_PROMPT_NEGATIVE_ANSWER: (workspace: string) =>
    `${chalk.bold(
      `Ok! Workspace ${ColorifyConstants.ID(workspace)} was not promoted.`
    )} If you are looking for other workspaces, run ${ColorifyConstants.COMMAND_OR_VTEX_REF('vtex workspace list')}.\n`,
  PROMOTE_SUCCESS: (workspace: string) =>
    `✨ ${chalk.bold('Success!')} The workspace ${ColorifyConstants.ID(
      workspace
    )} was promoted to ${ColorifyConstants.ID(
      'master'
    )}, taking your changes to the final users. All the content it had is now at the workspace ${ColorifyConstants.ID(
      'master'
    )} and the workspace ${ColorifyConstants.ID(workspace)} was deleted.`,
  PROMOTE_ASK_FEEDBACK: `What do you think about checking the workspace before promoting it? Please, tell us ${formatHyperlink(
    'here',
    'https://forms.gle/RZk6gS2nWUZQ9KQr9'
  )}.`,
  PROMOTE_MASTER_ERROR: (workspace: string) => `It is not possible to promote workspace ${workspace} to master`,
  PROMOTE_NOT_PRODUCTION_ERROR: (workspace: string) =>
    `Workspace ${ColorifyConstants.ID(workspace)} is not a ${ColorifyConstants.ID(
      'production'
    )} workspace\nOnly production workspaces may be promoted\nUse the command ${ColorifyConstants.COMMAND_OR_VTEX_REF(
      'vtex workspace create <workspace> --production'
    )} to create a production workspace`,
  PROMOTE_SPINNER_START: 'Preparing the workspace to be promoted',
  USE_SUCCESS: (workspace: string, account: string) =>
    `${chalk.bold('Workspace change:')} You are now using the workspace ${ColorifyConstants.ID(
      workspace
    )} on account ${ColorifyConstants.ID(account)}.\n`,
  DEPS_DIFF_INIT: (workspace1: string, workspace2: string) =>
    `${chalk.bold('Dependency diff')} between ${ColorifyConstants.ID(workspace1)} and ${ColorifyConstants.ID(
      workspace2
    )}`,
  DEPS_DIFF_EMPTY: (workspace1: string, workspace2: string) =>
    `${Messages.DEPS_DIFF_INIT(workspace1, workspace2)} is empty\n`,
  DEPS_LIST_INIT: 'Starting to list dependencies',
  DEPS_UPDATE_INIT: (locator: string) => `Starting to update ${locator}`,
  DEPS_UPDATE_INIT_PROCESS: 'Starting update process',
  DEPS_UPDATE_INVALID_FORMAT_ERROR: (locator: string) =>
    `App ${locator} has an invalid app format, please use <vendor>.<name>@<version>`,
  DEPS_UPDATE_EMPTY: 'No dependencies updated',
}
