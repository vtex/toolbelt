import semver from 'semver'
import chalk from 'chalk'
import {router} from '../../clients'
const {listAvailableServices, listInstalledServices, installService} = router
import inquirer from 'inquirer'
import {startSpinner, setSpinnerText, stopSpinner} from '../../spinner'
import {getTag, diffVersions} from './util'
import pad from 'pad'

export default {
  description: 'Update all installed services',
  handler: async function () {
    setSpinnerText('Getting available updates')
    startSpinner()
    const [availableRes, installedRes] = await Promise.all([
      listAvailableServices(),
      listInstalledServices(),
    ])

    stopSpinner()

    const updates = {}
    const colSize = Math.max(...installedRes.map(i => i.name.length))
    installedRes.forEach(installed => {
      const tag = getTag(installed.version)

      const latest = availableRes[installed.name].versions['aws-us-east-1']
        .filter(v => getTag(v) === tag).sort(semver.rcompare)[0]
      const current = installed.version

      if (current !== latest) {
        updates[installed.name] = latest
      }

      if (current === latest) {
        console.log(`${pad(installed.name, colSize)}  ${chalk.yellow(current)}`)
      } else {
        const [from, to] = diffVersions(current, latest)
        console.log(`${pad(installed.name, colSize)}  ${from} ${chalk.gray('->')} ${to}`)
      }
    })

    console.log('')
    if (Object.keys(updates).length === 0) {
      console.log('All up to date!')
      return
    }

    const {confirm} = await inquirer.prompt({
      type: 'confirm',
      name: 'confirm',
      message: 'Apply version updates?',
    })

    if (!confirm) {
      return
    }

    setSpinnerText('Installing')
    startSpinner()
    await Promise.all(Object.keys(updates)
      .map(name => installService(name, updates[name])))
    stopSpinner()
    console.log('All updates installed')
  },
}
