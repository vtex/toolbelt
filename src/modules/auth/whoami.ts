import { greeting } from '../../greeting'
import log from '../../logger'

export default () => {
  greeting.forEach((msg: string) => log.info(msg))
  return Promise.resolve()
}
