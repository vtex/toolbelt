import { CustomCommand } from '../oclif/CustomCommand'
import { hrTimeToMs } from '../lib/utils/hrTimeToMs'
const startMoment = require('../../bin/run').initTimeStartTime

export default class Perf extends CustomCommand {
  static description = 'Test initialization performance'
  static hidden = true
  static flags = {
    ...CustomCommand.globalFlags,
  }

  static args = []

  async run() {
    console.log({ startTime: hrTimeToMs(process.hrtime(startMoment)) })
  }
}
