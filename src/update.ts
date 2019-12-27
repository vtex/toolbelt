import chalk from 'chalk'
import * as updateNotifier from 'update-notifier'

import * as pkg from '../package.json'

export default function notify() {
  const notifier = updateNotifier({ pkg, updateCheckInterval: 1000 * 60 * 60 * 1 })
  if (notifier.update && notifier.update.latest !== pkg.version) {
    const oldVersion = notifier.update.current
    const latestVersion = notifier.update.latest
    const changelog = `https://github.com/vtex/toolbelt/blob/master/CHANGELOG.md`
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
      message: [
        `New ${type} version of ${pkg.name} available! ${chalk.dim(oldVersion)} → ${chalk.green(latestVersion)}`,
        `${chalk.yellow('Changelog:')} ${chalk.cyan(changelog)}`,
        `Run ${chalk.green(`yarn global add ${pkg.name}`)} to update!`,
      ].join('\n'),
    })
  }
}
