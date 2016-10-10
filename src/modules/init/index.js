import chalk from 'chalk'
import {join} from 'path'
import moment from 'moment'
import log from '../../logger'
import inquirer from 'inquirer'
import {writeManifest} from './utils'
import {dirnameJoin} from '../../file'
import {Promise, mapSeries} from 'bluebird'

const choices = [
  'render',
]

function promptService () {
  const cancel = 'Cancel'
  return Promise.try(() =>
    inquirer.prompt({
      name: 'service',
      message: 'Choose the VTEX service you will use',
      type: 'list',
      choices: [...choices, cancel],
    })
  )
  .then(({service}) => {
    if (service === cancel) {
      log.info('Bye o/')
      return process.exit()
    }
    return service
  })
}

function promptName () {
  const message = 'The app name should only contain number, letters, underscores and hyphen.'
  return Promise.try(() =>
    inquirer.prompt({
      name: 'name',
      message: 'What\'s your VTEX app name?',
      validate: s => /^[A-Za-z0-9\-_]+$/.test(s) || message,
      filter: s => s.trim(),
    })
  )
  .then(({name}) => name)
}

function promptVendor () {
  const message = 'The vendor should only contain number, letters, underscores and hyphen.'
  return Promise.try(() =>
    inquirer.prompt({
      name: 'vendor',
      message: 'What\'s your VTEX app vendor?',
      validate: s => /^[A-Za-z0-9\-_]+$/.test(s) || message,
      filter: s => s.trim(),
    })
  )
  .then(({vendor}) => vendor)
}

function promptTitle () {
  return Promise.try(() =>
    inquirer.prompt({
      name: 'title',
      message: 'What\'s your VTEX app title?',
      filter: s => s.trim(),
    })
  )
  .then(({title}) => title)
}

function promptDescription () {
  return Promise.try(() =>
    inquirer.prompt({
      name: 'description',
      message: 'What\'s your VTEX app description?',
      filter: s => s.trim(),
    })
  )
  .then(({description}) => description)
}

function createManifest (name, vendor, title = '', description = '') {
  const [year, ...monthAndDay] = moment().format('YYYY-MM-DD').split('-')
  return {
    name,
    vendor,
    version: '0.1.0',
    title,
    description,
    mustUpdateAt: `${Number(year) + 1}-${monthAndDay.join('-')}`,
    categories: [],
    settingsSchema: {},
    dependencies: {},
  }
}

export default {
  init: {
    description: 'Create basic files and folders for your VTEX app',
    handler: function () {
      log.debug('Prompting for app info')
      log.info('Hello! I will help you generate basic files and folders for your app.')
      return mapSeries([
        promptName,
        promptVendor,
        promptTitle,
        promptDescription,
      ], f => f())
      .spread((name, vendor, title, description) => {
        log.debug('Creating manifest file')
        const fullName = `${vendor}.${name}`
        return writeManifest(createManifest(name, vendor, title, description))
        .tap(() => log.info('Manifest file generated succesfully!'))
        .then(promptService)
        .then(service => require(join(__dirname, service)).default.handler())
        .tap(() => {
          console.log('')
          log.info(`${fullName} structure generated successfully.`)
          log.info(`Run ${chalk.bold.green('vtex watch')} to start developing!`)
        })
        .catch(err =>
          err && err.code === 'EEXIST'
            ? log.error(`Folder ${fullName} already exists.`)
            : Promise.reject(err)
        )
      })
    },
    render: {
      module: dirnameJoin('modules/init/render'),
    },
  },
}
