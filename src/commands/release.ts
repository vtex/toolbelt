import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../utils/CustomCommand'
import { supportedReleaseTypes, releaseTypeAliases, supportedTagNames, appsRelease } from '../lib/release'

export default class Release extends CustomCommand {
  static description =
    'Bump app version, commit and push to remote. Only for git users. The first option can also be a specific valid semver version'

  static aliases = ['release']

  static examples = [
    'vtex apps:release',
    'vtex release',
    'vtex release patch',
    'vtex release patch beta',
    'vtex release minor stable',
    'vtex release pre',
  ]

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
  }

  static args = [
    {
      name: 'releaseType',
      required: false,
      default: 'patch',
      options: [...supportedReleaseTypes, ...Object.keys(releaseTypeAliases)],
    },
    { name: 'tagName', required: false, default: 'beta', options: supportedTagNames },
  ]

  async run() {
    const {
      args: { releaseType, tagName },
    } = this.parse(Release)

    await appsRelease(releaseType, tagName)
  }
}
