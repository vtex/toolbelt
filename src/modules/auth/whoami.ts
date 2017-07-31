import log from '../../logger'
import {greeting} from '../../greeting'

export default () => {
  greeting.forEach((msg: string) => log.info(msg))
  return Promise.resolve()
}
