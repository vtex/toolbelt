import { flags } from '@oclif/command'
import chalk from 'chalk'
import { split } from 'ramda'

import { getAccount, getLastUsedAccount } from '../../conf'
import { CommandError } from '../../errors'
import log from '../../logger'
import { switchAccount } from '../../lib/auth/switch'
import { CustomCommand } from '../../lib/CustomCommand'

const hasAccountSwitched = (account: string) => {
  return account === getAccount()
}

export default class Switch extends CustomCommand {
  static description = 'Switch to another VTEX account'

  static aliases = ['switch']

  static examples = ['vtex auth:switch storecomponents', 'vtex switch storecomponents', 'vtex switch storecomponents myworkspace']

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  static args = [{ name: 'account', required: true }, { name: 'workspace', required: false, default: 'master' }]

  async run() {
    const { args } = this.parse(Switch)
    let account = args.account
    if (account === '-') {
      account = getLastUsedAccount()
      if (account == null) {
        throw new CommandError('No last used account was found')
      }
    }

    const previousAccount = getAccount()
    // Enable users to type `vtex switch {account}/{workspace}` and switch
    // directly to a workspace without typing the `-w` option.
    const [parsedAccount, parsedWorkspace] = split('/', account)
    let options
    if (parsedWorkspace) {
      options = { workspace: parsedWorkspace || args.workspace }
    }
    await switchAccount(parsedAccount, options)
    if (hasAccountSwitched(parsedAccount)) {
      log.info(`Switched from ${chalk.blue(previousAccount)} to ${chalk.blue(parsedAccount)}`)
    }
  }
}
