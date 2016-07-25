import updateNotifier from 'update-notifier'
import pkg from '../package.json'

export default function notify () {
  updateNotifier({pkg, updateCheckInterval: 0})
  .notify({defer: false})
}
