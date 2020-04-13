import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../oclif/CustomCommand'
import appsRelease from '../modules/release'

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
    help: oclifFlags.help({ char: 'h' }),
  }

  static args = [
    {
      name: 'releaseType',
      required: false,
      default: 'patch',
    },
    { name: 'tagName', required: false, default: 'beta' },
  ]

  async run() {
    const {
      args: { releaseType, tagName },
    } = this.parse(Release)

    await appsRelease(releaseType, tagName)
  }
}
