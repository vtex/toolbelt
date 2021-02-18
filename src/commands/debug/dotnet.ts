import { CustomCommand } from '../../api/oclif/CustomCommand'
import debugDotnet from '../../modules/debug/dotnet'

export default class DotnetDebug extends CustomCommand {
  static description = 'Debug .NET applications (IDEs only)'

  static flags = {
    ...CustomCommand.globalFlags,
  }

  static args = [{ name: 'debugInst', required: true }]

  async run() {
    const {
      args: { debugInst },
    } = this.parse(DotnetDebug)

    await debugDotnet(debugInst)
  }
}
