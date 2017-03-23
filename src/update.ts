import {curry} from 'ramda'
import * as Bluebird from 'bluebird'
import * as semverDiff from 'semver-diff'
import * as updateNotifier from 'update-notifier'

import * as pkg from '../package.json'

const updateCallback = curry(
  (resolve: Function, reject: Function, err, update): void => {
    if (err) {
      reject(err)
    }
    if (!semverDiff(update.current, update.latest)) {
      return resolve()
    }
    this.update = update
    resolve(this.notify())
  },
)

export default function notify (): Bluebird<void> {
  return new Promise<void>((resolve, reject) =>
    updateNotifier({pkg, callback: updateCallback(resolve, reject)}),
  )
}
