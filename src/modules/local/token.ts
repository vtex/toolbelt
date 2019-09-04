import clipboardy from 'clipboardy'
import { getToken } from '../../conf'

export default () => {
  const token = getToken()
  clipboardy.writeSync(token)
  return console.log(token)
}
