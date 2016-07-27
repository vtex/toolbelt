import ora from 'ora'
import log from '../logger'
import {Promise} from 'bluebird'
import {renderBuild} from '../render'
import {manifest} from '../manifest'
import {removeBuildFolder} from '../file'

let spinner
const root = process.cwd()

export default {
  render: {
    build: {
      description: 'Build app',
      handler: () => {
        log.debug('Starting to build app')
        spinner = ora('Building app...').start()
        return removeBuildFolder(root)
        .then(() => renderBuild(root, manifest))
        .then(() => spinner.stop())
        .catch(res => {
          if (spinner) {
            spinner.stop()
          }
          return Promise.reject(res)
        })
      },
    },
  },
}
