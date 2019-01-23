import axios from 'axios'
import * as inquirer from 'inquirer'
import { prop } from 'ramda'
import { getAccount, getToken, getWorkspace } from '../../conf'
import * as env from '../../env'



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

export default async ({ a, account, _ }) => {
  const supportedAccount = account || a || (_ && _[0])
  const actualToken = getToken()
  const region = env.region()
  try {
    const roles = await getAvailableRoles(region, actualToken, supportedAccount)
    const role = await promptRoles(roles)
    console.log({ role })
  }
  catch (err) {
    console.log({ err })
  }
}
