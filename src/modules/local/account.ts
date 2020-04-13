import { copyToClipboard } from './utils'
import { getAccount } from '../../conf'

export default () => {
  const account = getAccount()
  copyToClipboard(account)
  return console.log(account)
}
