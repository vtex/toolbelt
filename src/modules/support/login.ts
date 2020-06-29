import axios from 'axios'
import chalk from 'chalk'
import enquirer from 'enquirer'
import jwt from 'jsonwebtoken'
import { prop } from 'ramda'
import * as env from '../../api/env'
import { Headers } from '../../lib/constants/Headers'
import { SessionManager } from '../../api/session/SessionManager'
import log from '../../api/logger'

const getAvailableRoles = async (token: string, supportedAccount: string): Promise<string[]> => {
  const { account, workspace } = SessionManager.getSingleton()
  const response = await axios.get(
    `https://app.io.vtex.com/vtex.support-authority/v0/${account}/${workspace}/${supportedAccount}/roles`,
    {
      headers: {
        Authorization: token,
        [Headers.VTEX_ORIGINAL_CREDENTIAL]: token,
        ...(env.cluster() ? { [Headers.VTEX_UPSTREAM_TARGET]: env.cluster() } : null),
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

const loginAsRole = async (token: string, supportedAccount: string, role: string): Promise<string> => {
  const { account, workspace } = SessionManager.getSingleton()
  const response = await axios.get(
    `https://app.io.vtex.com/vtex.support-authority/v0/${account}/${workspace}/${supportedAccount}/login/${role}`,
    {
      headers: {
        Authorization: token,
        [Headers.VTEX_ORIGINAL_CREDENTIAL]: token,
        ...(env.cluster() ? { [Headers.VTEX_UPSTREAM_TARGET]: env.cluster() } : null),
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
  const session = SessionManager.getSingleton()
  session.DEPRECATEDchangeAccount(account)
  session.workspaceSwitch({ targetWorkspace: 'master' })
  session.DEPRECATEDchangeToken(token)
}

export default async (account: string) => {
  if (!account) {
    log.error(`Please specify the account that will receive support. type vtex --help for more information.`)
    return
  }
  const actualToken = SessionManager.getSingleton().token
  try {
    const roles = await getAvailableRoles(actualToken, account)
    if (roles.length === 0) {
      log.error('No support roles available for this account.')
      return
    }
    const role = await promptRoles(roles)
    const newToken = await loginAsRole(actualToken, account, role)
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
