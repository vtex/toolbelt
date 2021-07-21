import { CustomCommand } from '../api/oclif/CustomCommand'
import appsRelease, { releaseTypeAliases, supportedReleaseTypes, supportedTagNames } from '../modules/release'
import { flags as oclifFlags } from '@oclif/command'

export default class Release extends CustomCommand {
  static description =
    'Bump app version, commit and push to remote. Only for git users. The first option can also be a specific valid semver version'

  static examples = [
    'vtex release',
    'vtex release patch',
    'vtex release patch beta',
    'vtex release minor stable',
    'vtex release pre',
  ]

  static flags = {
    ...CustomCommand.globalFlags,
    'display-name': oclifFlags.boolean({
      description: 'Add the project name to the tag and release commit',
      default: false,
    }),
  }

  static args = [
    {
      name: 'releaseType',
      required: false,
      default: 'patch',
      options: [...Object.keys(releaseTypeAliases), ...supportedReleaseTypes],
    },
    { name: 'tagName', required: false, default: 'beta', options: supportedTagNames },
  ]

  async run() {
    const {
      args: { releaseType, tagName },
      flags: { 'display-name': displayName },
    } = this.parse(Release)

    await appsRelease(releaseType, tagName, displayName)
  }
}
