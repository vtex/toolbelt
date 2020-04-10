import { getAccount } from '../../conf'
import { copyToClipboard } from '../../utils/copyToClipboard'

export function authAccount() {
  const account = getAccount()
  copyToClipboard(account)
  return console.log(account)
}
