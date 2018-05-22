import * as updateNotifier from 'update-notifier'

import * as pkg from '../package.json'

export default function notify() {
  updateNotifier({ pkg, updateCheckInterval: 1000 * 60 * 60 * 1 }).notify({ isGlobal: true })
}
