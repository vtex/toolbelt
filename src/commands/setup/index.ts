import { flags } from '@oclif/command'

import { getManifest } from '../../manifest'
import { CustomCommand } from '../../lib/CustomCommand'
import { setupTooling } from '../../lib/setup/setupTooling'
import { setupTSConfig } from '../../lib/setup/setupTSConfig'
import { setupTypings } from '../../lib/setup/setupTypings'


export const setup = async (ignoreLinked: boolean) => {
  const manifest = await getManifest()

  setupTooling(manifest)
  await setupTSConfig(manifest)
  await setupTypings(manifest, ignoreLinked)
}

export default class Setup extends CustomCommand {
  static description = 'Download react app typings, graphql app typings, lint config and tsconfig'

  static examples = ['vtex setup']

  static flags = {
    help: flags.help({ char: 'h' }),
    'ignore-linked': flags.boolean({ char: 'i', description: 'Add only types from apps published', default: false }),
  }

  static args = []

  async run() {
    const { flags } = this.parse(Setup)
    const ignoreLinked = flags['ignore-linked']
    await setup(ignoreLinked)
  }
}
