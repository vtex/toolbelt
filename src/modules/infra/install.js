import semver from 'semver'
import chalk from 'chalk'
import log from '../../logger'
import {getAccount, getWorkspace} from '../../conf'
import {router} from '../../clients'
import inquirer from 'inquirer'
import {getLastStableAndPrerelease} from './util'

const cl = {
  service: chalk.bold.cyan,
  pre: chalk.yellow,
  stable: chalk.green,
}

export default {
  requiredArgs: 'name',
  description: 'Install a service',
  handler: async function (name) {
    const [account, workspace] = [getAccount(), getWorkspace()]
    const [service, version] = name.split('@')
    if (version) {
      install(account, workspace, service, version,
        `Install ${cl.service(service)} version ${cl.stable(version)}?`)
    } else {
      const availableRes = await router().getAvailableVersions(name)
      const [stable, prerelease] = getLastStableAndPrerelease(availableRes)

      const installedRes = await router().listInstalledServices(account, workspace)
      const installedService = installedRes.find(s => s.name === name)

      const [version, message] = getVersionAndMessage(
        name, installedService ? installedService.version : null, stable, prerelease)
      install(account, workspace, service, version, message)
    }
  },
}

async function install (account: string, workspace: string, service: string, version: string, message: string) {
  const {confirm} = await inquirer.prompt({
    type: 'confirm',
    name: 'confirm',
    message,
  })

  if (confirm) {
    version = version.indexOf('v') === 0 ? version : 'v' + version
    await router().installService(account, workspace, service, version)
    log.info('Installation completed')
  } else {
    log.error('User cancelled')
  }
}

function getVersionAndMessage (service, currentVersion, latestStable, latestPrerelease) {
  if (currentVersion) {
    if (semver.prerelease(currentVersion) !== null) {
      return [latestPrerelease, `Update ${cl.service(service)} from ${cl.pre(currentVersion)} to ${cl.pre(latestPrerelease)}?`]
    }
    return [latestStable, `Update ${cl.service(service)} from ${cl.stable(currentVersion)} to ${cl.stable(latestStable)}?`]
  }
  return [latestStable, `Install ${cl.service(service)} version ${cl.stable(latestStable)}?`]
}
