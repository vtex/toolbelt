import { CustomCommand } from '../api/oclif/CustomCommand'
import appsRelease, { releaseTypeAliases, supportedReleaseTypes, supportedTagNames } from '../modules/release'

export default class Release extends CustomCommand {
  static description =
    '(Only for git users.) Bumps the app version, commits, and pushes to remote the app in the current directory.'

  static examples = [
    'vtex release',
    'vtex release patch',
    'vtex release patch beta',
    'vtex release minor stable',
    'vtex release pre',
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
      description: 'Release type (major, minor, or patch).',
    },
    { name: 'tagName', required: false, default: 'beta', options: supportedTagNames, description: 'Tag name (e.g., stable, beta).' },
  ]

  async run() {
    const {
      args: { releaseType, tagName },
    } = this.parse(Release)

    await appsRelease(releaseType, tagName)
  }
}
