import {getToken} from '../../conf'
import {VBaseClient} from '@vtex/api'
import userAgent from '../../user-agent'

export const client = () => new VBaseClient(getToken(), userAgent, 'BETA')
