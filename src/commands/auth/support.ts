import axios from 'axios'
import chalk from 'chalk'
import enquirer from 'enquirer'
import jwt from 'jsonwebtoken'
import { prop } from 'ramda'
import { flags } from '@oclif/command'

import { getAccount, getToken, getWorkspace, saveAccount, saveToken, saveWorkspace } from '../../conf'
import * as env from '../../env'
import log from '../../logger'
import { CustomCommand } from '../../lib/CustomCommand'

const getAvailableRoles = async (region: string, token: string, supportedAccount: string): Promise<string[]> => {
  const response = await axios.get(
    `http://support-authority.vtex.${region}.vtex.io/${getAccount()}/${getWorkspace()}/${supportedAccount}/roles`,
    {
      headers: {
        Authorization: token,
        'X-Vtex-Original-Credential': token,
      },
    }
  )
  return response.data
}

const promptRoles = async (roles: string[]): Promise<string> => {
  const cancel = 'Cancel'
  const chosen = prop<string>(
    'role',
    await enquirer.prompt({
      name: 'role',
      message: 'Which role do you want to assume?',
      type: 'select',
      choices: [...roles, cancel],
    })
  )
  if (chosen === cancel) {
    log.info('Bye! o/')
    return process.exit()
  }
  return chosen
}

const loginAsRole = async (region: string, token: string, supportedAccount: string, role: string): Promise<string> => {
  const response = await axios.get(
    `http://support-authority.vtex.${region}.vtex.io/${getAccount()}/${getWorkspace()}/${supportedAccount}/login/${role}`,
    {
      headers: {
        Authorization: token,
        'X-Vtex-Original-Credential': token,
      },
    }
  )
  return response.data
}

const assertToken = (raw: string): void => {
  if (!jwt.decode(raw)) {
    throw Error(`Could not validate new token! token = '${raw}'`)
  }
}

const saveSupportCredentials = (account: string, token: string): void => {
  saveAccount(account)
  saveWorkspace('master')
  saveToken(token)
}

export default class Support extends CustomCommand {
  static description = 'Login as support into another VTEX account'

  static aliases = ['support']

  static examples = ['vtex auth:support storecomponents', 'vtex auth:support']

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  static args = [{ name: 'account', required: true }]

  async run() {
    const { args } = this.parse(Support)
    const account = args.account
    const actualToken = getToken()
    const region = env.region()
    try {
      const roles = await getAvailableRoles(region, actualToken, account)
      if (roles.length === 0) {
        log.error('No support roles available for this account.')
        return
      }
      const role = await promptRoles(roles)
      const newToken = await loginAsRole(region, actualToken, account, role)
      assertToken(newToken)
      saveSupportCredentials(account, newToken)
      log.info(`Logged into ${chalk.blue(account)} with role ${role}!`)
    } catch (err) {
      if (err.message) {
        log.error(err.message)
        if (err.response && err.response.status === 404) {
          log.info('Make sure vtex.support-authority is installed in your workspace.')
        }
        return
      }
      log.error(err)
    }
  }
}
