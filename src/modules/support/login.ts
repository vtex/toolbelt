import axios from 'axios'
import * as inquirer from 'inquirer'
import * as jwt from 'jsonwebtoken'
import { prop } from 'ramda'
import { getAccount, getToken, getWorkspace, saveAccount, saveToken, saveWorkspace } from '../../conf'
import * as env from '../../env'
import log from '../../logger'

const getAvailableRoles = async (region: string, token: string, supportedAccount: string): Promise<string[]> => {
  const response = await axios.get(
    `http://support-authority.vtex.${region}.vtex.io/${getAccount()}/${getWorkspace()}/${supportedAccount}/roles`,
    {
      headers: {
        'Authorization': token,
      },
    }
  )
  return response.data
}

const promptRoles = async (roles: string[]): Promise<string> => {
  const cancel = 'Cancel'
  const chosen = prop<string>('role', await inquirer.prompt({
    name: 'role',
    message: 'Which role do you want to assume?',
    type: 'list',
    choices: [...roles, cancel],
  }))
  if (chosen === cancel) {
    console.info('Bye! o/')
    return process.exit()
  }
  return chosen
}

const loginAsRole = async (region: string, token: string, supportedAccount: string, role: string): Promise<string> => {
  const response = await axios.get(
    `http://support-authority.vtex.${region}.vtex.io/${getAccount()}/${getWorkspace()}/${supportedAccount}/login/${role}`,
    {
      headers: {
        'Authorization': token,
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

export default async ({ a, account, _ }) => {
  const supportedAccount = account || a || (_ && _[0])
  const actualToken = getToken()
  const region = env.region()
  try {
    const roles = await getAvailableRoles(region, actualToken, supportedAccount)
    const role = await promptRoles(roles)
    console.log({ role })
    const newToken = await loginAsRole(region, actualToken, supportedAccount, role)
    assertToken(newToken)
    saveSupportCredentials(supportedAccount, newToken)
  }
  catch (err) {
    if (err.message) {
      log.error(err.message)
      return
    }
    log.error(err)
  }
}
