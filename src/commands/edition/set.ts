import { CustomCommand } from '../../api/oclif/CustomCommand'
import editionSet from '../../modules/sponsor/setEdition'

export default class EditionSet extends CustomCommand {
  static description = 'Set edition of the current account'

  static examples = ['vtex edition set editionName']

  static flags = {
    ...CustomCommand.globalFlags,
  }

  static args = [{ name: 'edition', required: true }]

  async run() {
    const {
      args: { edition },
    } = this.parse(EditionSet)

    await editionSet(edition)
  }
}
