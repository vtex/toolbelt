import clipboardy from 'clipboardy'
import { getAccount } from '../../conf'

export default () => {
  const account = getAccount()
  clipboardy.writeSync(account)
  return console.log(account)
}
