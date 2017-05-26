import * as ora from 'ora'
import * as chalk from 'chalk'
import * as inquirer from 'inquirer'
import * as pad from 'pad'
import * as semver from 'semver'
import * as Bluebird from 'bluebird'
import {find, propEq, prop, contains} from 'ramda'
import log from '../../logger'
import {router} from '../../clients'

const {listAvailableIoVersions, installIo, listInstalledServices} = router

const promptInstall = (version: IoVersions): Bluebird<boolean> =>
  Promise.resolve(
    inquirer.prompt({
      type: 'confirm',
      name: 'confirm',
      message: `Continue with the installation of version ${chalk.green(version.version)}?`,
    })
    .then<boolean>(prop('confirm')),
  )

const installVersion = (version: string): Bluebird<any> => {
  const spinner = ora('Getting versions').start()
  return Promise.all([listAvailableIoVersions(), listInstalledServices()])
    .tap(() => spinner.stop())
    .spread<[IoVersions, InfraInstalledResources[]]>((availableIoVersions: IoVersions[], installedResouces: InfraInstalledResources[]) => {
      const foundVersion = find<IoVersions>(propEq('version', version))(availableIoVersions)
      return [foundVersion, installedResouces]
    })
    .spread((ioVersion: IoVersions, installedResources: InfraInstalledResources[]) => {
      if (ioVersion) {
        if (logVersionMap(ioVersion, installedResources)) {
          return promptInstall(ioVersion)
            .then(confirm => {
              if (confirm) {
                return installIo(ioVersion.version)
                  .then(() => log.info('Installation complete'))
              }
            })
        }
      } else {
        log.error(`No suitable version`)
        return null
      }
    })
    .catch(err => {
      spinner.stop()
      throw err
    })
}

const hasTag = (version: string, tag: string): boolean => {
  const pre: Array<string> = semver.prerelease(version)
  return (tag === 'stable' && !pre) || (contains(tag, pre || []))
}

const logVersionMap = (ioVersion: IoVersions, installedResouces: InfraInstalledResources[]): boolean => {
  let shouldUpdate = false
  const ioVersionServices = Object.keys(ioVersion.services).sort()
  ioVersionServices.forEach(service => {
    const actualVersion = find<InfraInstalledResources>(propEq('name', service))(installedResouces)
    if (actualVersion) {
      if (actualVersion.version === ioVersion.services[service]) {
        console.log(`${pad(service, 15)}  ${chalk.yellow(actualVersion.version)}`)
      } else {
        shouldUpdate = true
        console.log(`${pad(service, 15)}  ${actualVersion.version} ${chalk.gray('->')} ${chalk.green(ioVersion.services[service])}`)
      }
    } else {
      shouldUpdate = true
      console.log(`${pad(service, 15)}  NA ${chalk.gray('->')} ${chalk.green(ioVersion.services[service])}`)
    }
  })
  console.log('')
  return shouldUpdate
}

const installVersionByTag = (tag: string): Bluebird<{}> => {
  const spinner = ora('Getting versions').start()
  return Promise.all([listAvailableIoVersions(), listInstalledServices()])
    .tap(() => spinner.stop())
    .spread((availableIoVersions: IoVersions[], installedResouces: InfraInstalledResources[]) => {
      const versionsByTag = availableIoVersions
        .filter(v => !tag || hasTag(v.version, tag))
        .sort((a, b) => semver.compare(b.version, a.version))

      if (versionsByTag.length === 0) {
        log.error(`No suitable version`)
        return null
      }

      const versionToInstall = versionsByTag[0]
      if (logVersionMap(versionToInstall, installedResouces)) {
        return promptInstall(versionToInstall)
          .then(confirm => {
            if (confirm) {
              return installIo(versionToInstall.version)
                .then(() => log.info('Installation complete'))
            }
          })
      }
    })
}

export default {
  optionalArgs: 'version',
  description: 'Install VTEX IO Version',
  options: [
    {
      short: 't',
      long: 'tag',
      description: 'Install last version by Tag',
      type: 'string',
    },
  ],
  handler: (version: string, options) => {
    const tag = options.t || options.tag
    return version ? installVersion(version) : installVersionByTag(tag)
  },
}
