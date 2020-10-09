import chalk from 'chalk'
import updateNotifier from 'update-notifier'
import { ColorifyConstants } from './api/constants/Colors'
import { Messages } from './lib/constants/Messages'

import * as pkg from '../package.json'
import { getDistTag, getSimpleVersion } from './modules/utils'

export function updateNotify() {
  const distTag = getDistTag(pkg.version)
  const notifier = updateNotifier({ pkg, distTag, updateCheckInterval: 1000 * 60 * 60 * 1 })
  if (notifier.update && notifier.update.latest !== getSimpleVersion(pkg.version)) {
    const oldVersion = getSimpleVersion(notifier.update.current)
    const latestVersion = notifier.update.latest
    const changelog = `https://github.com/vtex/toolbelt/blob/master/CHANGELOG.md`

    notifier.notify({
      isGlobal: true,
      //@ts-ignore
      isYarnGlobal: true,
      message: [
        `There is a new Toolbelt version avaible: ${chalk.dim(oldVersion)} → ${chalk.green(latestVersion)}`,
        Messages.UPDATE_TOOLBELT(),
        `Changelog: ${ColorifyConstants.URL_INTERACTIVE(changelog)}`,
      ].join('\n'),
    })
  }
}
