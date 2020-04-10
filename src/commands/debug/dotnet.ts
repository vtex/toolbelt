import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../../utils/CustomCommand'
import { debugDotnet } from '../../lib/debug/dotnet'

export default class DotnetDebug extends CustomCommand {
  static description = 'Debug for .NET applications'

  static examples = ['vtex debug dotnet debugInst']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
  }

  static args = [{ name: 'debugInst', required: true }]

  async run() {
    const {
      args: { debugInst },
    } = this.parse(DotnetDebug)

    await debugDotnet(debugInst)
  }
}
