import {join} from 'path'
import {prop} from 'ramda'
import * as chalk from 'chalk'
import * as moment from 'moment'
import * as Bluebird from 'bluebird'
import * as inquirer from 'inquirer'

import log from '../../logger'
import {writeManifest} from './utils'

const choices = ['render', 'service', 'functions']
const {mapSeries} = Bluebird

const currentFolderName = process.cwd().replace(/.*\//, '')

const promptService = (): Bluebird<string> => {
  const cancel = 'Cancel'
  return Promise.resolve(
    inquirer.prompt({
      name: 'service',
      message: 'Choose the VTEX service you will use',
      type: 'list',
      choices: [...choices, cancel],
    }),
  )
  .then(({service}) => {
    if (service === cancel) {
      log.info('Bye o/')
      return process.exit()
    }
    return service
  })
}

const promptName = (): Bluebird<string> => {
  const message = 'The app name should only contain numbers, lowercase letters, underscores and hyphens.'
  return Promise.resolve(
    inquirer.prompt({
      name: 'name',
      message: 'What\'s your VTEX app name?',
      validate: s => /^[a-z0-9\-_]+$/.test(s) || message,
      filter: s => s.trim(),
      default: currentFolderName,
    }),
  )
  .then<string>(prop('name'))
}

const promptVendor = (): Bluebird<string> => {
  const message = 'The vendor should only contain numbers, lowercase letters, underscores and hyphens.'
  return Promise.resolve(
    inquirer.prompt({
      name: 'vendor',
      message: 'What\'s your VTEX app vendor?',
      validate: s => /^[a-z0-9\-_]+$/.test(s) || message,
      filter: s => s.trim(),
      default: null,
    }),
  )
  .then<string>(prop('vendor'))
}

const promptTitle = (): Bluebird<string> => {
  return Promise.resolve(
    inquirer.prompt({
      name: 'title',
      message: 'What\'s your VTEX app title?',
      filter: s => s.trim(),
    }),
  )
  .then<string>(prop('title'))
}

const promptDescription = (): Bluebird<string> => {
  return Promise.resolve(
    inquirer.prompt({
      name: 'description',
      message: 'What\'s your VTEX app description?',
      filter: s => s.trim(),
    }),
  )
  .then<string>(prop('description'))
}

const createManifest = (name: string, vendor: string, title = '', description = ''): Manifest => {
  const [year, ...monthAndDay] = moment().format('YYYY-MM-DD').split('-')
  return {
    name,
    vendor,
    version: '0.1.0',
    title,
    description,
    mustUpdateAt: `${Number(year) + 1}-${monthAndDay.join('-')}`,
    categories: [],
    registries: ['smartcheckout'],
    settingsSchema: {},
    dependencies: {},
    builders: {},
  }
}

export default () => {
  log.debug('Prompting for app info')
  log.info('Hello! I will help you generate basic files and folders for your app.')
  return mapSeries([
    promptName,
    promptVendor,
    promptTitle,
    promptDescription,
  ], f => f())
    .spread((name: string, vendor: string, title: string, description: string) => {
      log.debug('Creating manifest file')
      const fullName = `${vendor}.${name}`
      return writeManifest(createManifest(name, vendor, title, description))
        .tap(() => log.info('Manifest file generated succesfully!'))
        .then(promptService)
        .then((service: string) =>
          require(join(__dirname, service)).default(),
        )
        .tap(() => {
          console.log('')
          log.info(`${fullName} structure generated successfully.`)
          log.info(`Run ${chalk.bold.green('vtex link')} to start developing!`)
        })
        .catch(err =>
          err && err.code === 'EEXIST'
            ? log.error(`Folder ${fullName} already exists.`)
            : Promise.reject(err),
        )
    })
}
