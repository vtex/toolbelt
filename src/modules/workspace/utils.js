import {getToken} from '../../conf'
import {VBaseClient} from '@vtex/api'
import userAgent from '../../user-agent'
import endpoint from '../../endpoint'

const options = {authToken: getToken(), userAgent}
export const client = () => new VBaseClient(endpoint('vbase'), options)
