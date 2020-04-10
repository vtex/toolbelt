import axios from 'axios'
import chalk from 'chalk'
import enquirer from 'enquirer'
import jwt from 'jsonwebtoken'
import { prop } from 'ramda'

import { getAccount, getToken, getWorkspace, saveAccount, saveToken, saveWorkspace } from '../../conf'
import * as env from '../../env'
import log from '../../logger'

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
    throw new Error(`Could not validate new token! token = '${raw}'`)
  }
}

const saveSupportCredentials = (account: string, token: string): void => {
  saveAccount(account)
  saveWorkspace('master')
  saveToken(token)
}

export async function authSupport(account: string) {
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
