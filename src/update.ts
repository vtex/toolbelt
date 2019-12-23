import chalk from 'chalk'
import * as updateNotifier from 'update-notifier'

import * as pkg from '../package.json'

const notifier = updateNotifier({ pkg, updateCheckInterval: 1000 * 60 * 60 * 1 })

export default function notify() {
  if (notifier.update && notifier.update.latest !== pkg.version) {
    const oldVersion = notifier.update.current
    const latestVersion = notifier.update.latest
    const changelog = `https://github.com/vtex/toolbelt/releases/tag/v${latestVersion}`
    let type = notifier.update.type

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
      message: `New ${type} version of ${pkg.name} available! ${chalk.dim(oldVersion)} → ${chalk.green(latestVersion)}\n
        ${chalk.yellow('Changelog:')} ${chalk.cyan(changelog)}\n
        Run ${chalk.green(`yarn global add ${pkg.name}`)} to update!`,
    })
  }
}
