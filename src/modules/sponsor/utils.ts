import { getAccount, getToken, getWorkspace } from '../../conf'
import * as env from '../../env'
import envTimeout from '../../timeout'
import userAgent from '../../user-agent'


const DEFAULT_TIMEOUT = 10000

export const options = {
  timeout: (envTimeout || DEFAULT_TIMEOUT) as number,
  retries: 3,
}

export const getIOContext = () => ({
  account: getAccount(),
  authToken: getToken(),
  production: false,
  region: env.region(),
  route: {
    id: '',
    params: {},
  } ,
  userAgent,
  workspace: getWorkspace(),
  requestId: '',
  operationId: '',
})
