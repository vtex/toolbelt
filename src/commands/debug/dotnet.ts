import { flags } from '@oclif/command'

import { CustomCommand } from '../../lib/CustomCommand'
import { Runtime } from '../../clients/runtime'
import { ManifestEditor } from '../../lib/manifest'
import logger from '../../logger'
import { getIOContext } from '../../lib/utils'

export default class DotnetDebug extends CustomCommand {
  static description = 'Debug for .NET applications'

  static examples = ['vtex debig:dotnet debugInst']

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  static args = [{ name: 'debugInst', required: true }]

  async run() {
    const {
      args: { debugInst: debug },
    } = this.parse(DotnetDebug)

    const manifest = await ManifestEditor.getManifestEditor()
    const { name, vendor, builders } = manifest
    if (!builders?.dotnet) {
      logger.error('This command can only be used for dotnet apps')
      return
    }

    const runtimeClient = new Runtime(getIOContext())
    await runtimeClient.debugDotnetApp(name, vendor, manifest.majorRange, debug)
  }
}
