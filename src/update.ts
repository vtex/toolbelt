import * as updateNotifier from 'update-notifier'

import * as pkg from '../package.json'

export default function notify () {
  updateNotifier({pkg}).notify()
}
