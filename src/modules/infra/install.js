import semver from 'semver'
import chalk from 'chalk'
import log from '../../logger'
import {startSpinner, setSpinnerText, stopSpinner} from '../../spinner'
import {router} from '../../clients'
import inquirer from 'inquirer'
import {getTag, diffVersions} from './util'

export default {
  requiredArgs: 'name',
  description: 'Install a service',
  handler: async function (name) {
    try {
      const [service, suffix] = name.split('@')

      setSpinnerText('Getting versions')
      startSpinner()
      const [available, installed] = await Promise.all([
        router().getAvailableVersions(service).then(data => data.versions['aws-us-east-1']),
        router().listInstalledServices()
          .then(data => data.find(s => s.name === service))
          .then(s => s ? s.version : s),
      ])
      stopSpinner()

      const newVersion = getNewVersion(service, suffix, installed, available)
      if (!newVersion) {
        log.error(`No suitable version for ${name}`)
        return
      }

      if (newVersion === installed) {
        console.log(`${service}  ${chalk.yellow(installed)}`)
        console.log()
        log.info('Service is up to date.')
        return
      }

      if (installed) {
        const [from, to] = diffVersions(installed, newVersion)
        console.log(`${service}  ${from} ${chalk.gray('->')} ${to}`)
      } else {
        console.log(`${service}  ${chalk.green(newVersion)}`)
      }

      console.log()
      const {confirm} = await inquirer.prompt({
        type: 'confirm',
        name: 'confirm',
        message: 'Apply update?',
      })

      if (!confirm) {
        return
      }

      await router().installService(service, newVersion)
      log.info('Installation complete')
    }finally {
      stopSpinner()
    }
  },
}

function getNewVersion (service: string, suffix: string, installed: string, available: string[]): string {
  if (semver.validRange(suffix, true)) {
    return findVersion(available, v => semver.satisfies(v, suffix, true))
  }

  if (suffix) {
    if (semver.valid(suffix)) {
      if (!available.find(v => v === suffix)) {
        return undefined
      }
      return suffix
    }

    if (suffix === 'stable') {
      suffix = null
    }
    return findVersion(available, v => getTag(v) === null)
  }

  if (!installed) {
    return findVersion(available, v => semver.prerelease(v) === null)
  }

  const tag = getTag(installed)
  if (!tag) {
    return findVersion(available, v => semver.prerelease(v) === null)
  }

  return findVersion(available, v => getTag(v) === tag)
}

function findVersion (pool: string[], predicate: (version: string) => boolean): string {
  return pool.filter(v => semver.valid(v)).filter(predicate).sort(semver.rcompare).shift()
}
