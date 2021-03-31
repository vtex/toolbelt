import { CustomCommand } from '../api/oclif/CustomCommand'
import appsRelease, { releaseTypeAliases, supportedReleaseTypes, supportedTagNames } from '../modules/release'

import { ColorifyConstants } from '../api/constants/Colors'

export default class Release extends CustomCommand {
  static description =
    '(Only for git users) Bumps the app version, commits, and pushes to remote the app in the current directory.'

  static examples = [
    `${ColorifyConstants.COMMAND_OR_VTEX_REF('vtex release')}`,
    `${ColorifyConstants.COMMAND_OR_VTEX_REF('vtex release')} patch`,
    `${ColorifyConstants.COMMAND_OR_VTEX_REF('vtex release')} patch beta`,
    `${ColorifyConstants.COMMAND_OR_VTEX_REF('vtex release')} minor stable`,
    `${ColorifyConstants.COMMAND_OR_VTEX_REF('vtex release')} pre`,
  ]

  static flags = {
    ...CustomCommand.globalFlags,
  }

  static args = [
    {
      name: 'releaseType',
      required: false,
      default: 'patch',
      options: [...Object.keys(releaseTypeAliases), ...supportedReleaseTypes],
      description: `Release type.`,
    },
    { name: 'tagName', required: false, default: 'beta', options: supportedTagNames, description: `Tag name.` },
  ]

  async run() {
    const {
      args: { releaseType, tagName },
    } = this.parse(Release)

    await appsRelease(releaseType, tagName)
  }
}
