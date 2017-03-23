import log from '../../logger'
import {greeting} from '../../greeting'

export default {
  description: 'See your credentials current status',
  handler: () => {
    greeting.forEach((msg: string) => log.info(msg))
    return Promise.resolve()
  },
}
