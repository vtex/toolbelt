import chalk from 'chalk'
import updateNotifier from 'update-notifier'
import { ColorifyConstants } from './api/constants/Colors'
import { updateMessageSwitch } from './lib/constants/Messages'

import * as pkg from '../package.json'
import { getDistTag, getSimpleVersion } from './modules/utils'

const ONE_HOUR = 1000 * 60 * 60 * 1

export function updateNotify() {
  const distTag = getDistTag(pkg.version)
  const notifier = updateNotifier({ pkg, distTag, updateCheckInterval: ONE_HOUR })

  if (notifier.update && notifier.update.latest !== getSimpleVersion(pkg.version)) {
    const oldVersion = getSimpleVersion(notifier.update.current)
    const latestVersion = notifier.update.latest
    const changelog = `https://github.com/vtex/toolbelt/blob/master/CHANGELOG.md`

    notifier.notify({
      isGlobal: true,
      // @ts-ignore
      isYarnGlobal: true,
      message: [
        `A new version is available for the VTEX Toolbelt: ${chalk.dim(oldVersion)} → ${chalk.green(latestVersion)}`,
        `To update, you must use the same method you used to install. As the following example(s):`,
        ...updateMessageSwitch(),
        `Changelog: ${ColorifyConstants.URL_INTERACTIVE(changelog)}`,
      ].join('\n'),
    })
  }
}
