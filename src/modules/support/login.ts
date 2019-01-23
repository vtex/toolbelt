import axios from 'axios'
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

export default async ({ a, account, _ }) => {
  const supportedAccount = account || a || (_ && _[0])
  const actualToken = getToken()
  const region = env.region()
  try {
    const roles = await getAvailableRoles(region, actualToken, supportedAccount)

    console.log({ roles })
  }
  catch (err) {
    console.log({ err })
  }
}
