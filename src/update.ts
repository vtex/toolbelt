import chalk from 'chalk'
import updateNotifier from 'update-notifier'
import { ColorifyConstants } from './api/constants/Colors'

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
        `To update, you must use the same method you used to install. As the following examples:\n`,
        `• If you installed using ${ColorifyConstants.COMMAND_OR_VTEX_REF(
          `yarn`
        )}, update running ${ColorifyConstants.COMMAND_OR_VTEX_REF(`yarn global add vtex`)}.\n`,
        `• If you installed using our new method there is in alpha-version, update running ${ColorifyConstants.COMMAND_OR_VTEX_REF(
          `vtex autoupdate`
        )}.\n`,
        `Changelog: ${ColorifyConstants.URL_INTERACTIVE(changelog)}`,
      ].join('\n'),
    })
  }
}
