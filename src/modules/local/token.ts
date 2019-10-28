import { copyToClipboard } from './utils'
import { getToken } from '../../conf'

export default () => {
  const token = getToken()
  copyToClipboard(token)
  return console.log(token)
}
