import chalk from 'chalk'
import updateNotifier from 'update-notifier'
import { ColorifyConstants } from './api/constants/Colors'
import { Messages } from './lib/constants/Messages'

import * as pkg from '../package.json'

export function updateNotify() {
  const notifier = updateNotifier({ pkg, updateCheckInterval: 1000 * 60 * 60 * 1 })
  if (notifier.update && notifier.update.latest !== pkg.version) {
    const oldVersion = notifier.update.current
    const latestVersion = notifier.update.latest
    const changelog = `https://github.com/vtex/toolbelt/blob/master/CHANGELOG.md`
    let { type } = notifier.update

    switch (type) {
      case 'major':
        type = chalk.red(type)
        break
      case 'minor':
        type = chalk.yellow(type)
        break
      case 'patch':
        type = chalk.green(type)
        break
    }

    notifier.notify({
      isGlobal: true,
      isYarnGlobal: true,
      message: [
        `There is a new Toolbelt version avaible: ${chalk.dim(oldVersion)} → ${chalk.green(latestVersion)}`,
        Messages.UPDATE_TOOLBELT(),
        `\n` + `Changelog: ${ColorifyConstants.URL_INTERACTIVE(changelog)}`,
      ].join('\n'),
    })
  }
}
