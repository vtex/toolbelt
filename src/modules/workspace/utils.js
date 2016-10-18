import {getToken} from '../../conf'
import {VBaseClient} from '@vtex/api'
import userAgent from '../../user-agent'
import endpoint from '../../endpoint'

export const client = () => new VBaseClient(getToken(), userAgent, endpoint('vbase'))
