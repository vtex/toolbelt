import * as ora from 'ora'
//import * as chalk from 'chalk'
// import * as semver from 'semver'
import * as inquirer from 'inquirer'
import * as Bluebird from 'bluebird'
import {find, propEq, prop} from 'ramda'
import log from '../../logger'

import {router} from '../../clients'
//import {getTag, diffVersions} from './utils'

//const VERSIONS_REGION = 'aws-us-east-1'
const {listAvailableIoVersions, installIo} = router


const promptInstall = (): Bluebird<boolean> =>
  Promise.resolve(
    inquirer.prompt({
      type: 'confirm',
      name: 'confirm',
      message: 'Continue with the installation?',
    })
    .then<boolean>(prop('confirm')),
  )

const logInstall = (version: IoVersions): void => {
    if (!version) {
      log.error(`No suitable version`)
      return
    }
  }


export default {
  requiredArgs: 'version',
  description: 'Install Io Version',
  handler: (version: string) => {
    const spinner = ora('Getting versions').start()
    return listAvailableIoVersions()
      .then((availableIoVersions: IoVersions[]) => {
          const foundVersion = find(propEq('version', version))(availableIoVersions);
          spinner.stop()
          return foundVersion;
      })
      .tap(logInstall)
      .then((version: IoVersions) => {
        if(version) {
          return promptInstall()
          .then(confirm => {
            if(confirm) {
              return installIo(version.version)
                .then(() => log.info('Installation complete'))
            }
          })
        } else{
          return null;
        }
      })
      .catch(err => {
        spinner.stop()
        throw err
    })
  },
}
