import * as boxen from 'boxen'
import chalk from 'chalk'
import * as getLatestVersion from 'latest-version'
import * as semver from 'semver'
import log from './logger'

import * as pkg from '../package.json'

const packageName = pkg.name
const currentVersion = pkg.version
const boxenOpts = {
  padding: 1,
  margin: 1,
  align: 'center',
  borderColor: 'yellow',
  borderStyle: 'round',
}

const shouldNotify = (oldVersion: string, newVersion: string) =>
  semver.gt(newVersion, oldVersion)

const newVersionAvailableMessage = (oldVersion: string, newVersion: string) =>
`New ${chalk.yellow(semver.diff(oldVersion, newVersion))} version of vtex available! \
${chalk.red(oldVersion)} → ${chalk.green(newVersion)}\n ${chalk.yellow('Changelog:')} \
${chalk.blue('https://github.com/vtex/toolbelt/blob/master/CHANGELOG.md')}\n \
Run ${chalk.green('yarn global upgrade vtex')} to update!
`

export default async () => {
  try {
    const latestVersion = await getLatestVersion(packageName)
    if (shouldNotify(currentVersion, latestVersion)) {
      console.log(`${boxen(newVersionAvailableMessage(currentVersion, latestVersion), boxenOpts as any)}`)
    }
  } catch(e) {
    log.debug(`Failed to check latest version of vtex`)
  }
}
