import {getToken} from '../../conf'
import * as clipboardy from 'clipboardy'

export default () => {
  const token = getToken()
  clipboardy.writeSync(token)
  return console.log(token)
}
