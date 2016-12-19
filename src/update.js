import pkg from '../package.json'
import semverDiff from 'semver-diff'
import updateNotifier from 'update-notifier'

function updateCallback (err, update) {
  if (err) {
    throw Error(err)
  }

  if (!semverDiff(update.current, update.latest)) {
    return
  }

  this.update = update
  this.notify()
}

export default function notify () {
  updateNotifier({pkg, callback: updateCallback})
}
