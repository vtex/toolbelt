import {getToken} from '../../conf'
import {VBaseClient} from '@vtex/api'
import userAgent from '../../user-agent'
import endpoint from '../../endpoint'
import timeout from '../../timeout'

export const client = () => new VBaseClient(endpoint('vbase'), {authToken: getToken(), userAgent, timeout})
