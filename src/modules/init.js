import {join} from 'path'
import chalk from 'chalk'
import moment from 'moment'
import log from '../logger'
import inquirer from 'inquirer'
import {mkdir, writeFile} from 'fs'
import {Promise, promisify, mapSeries} from 'bluebird'

const bbMkdir = promisify(mkdir)
const bbWriteFile = promisify(writeFile)

function promptService () {
  return Promise.try(() =>
    inquirer.prompt({
      name: 'service',
      message: 'Choose the VTEX service you will use',
      type: 'list',
      choices: ['render'],
    })
  )
  .then(({service}) => service)
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
      name: 'vendor',
      message: 'What\'s your VTEX app title?',
      filter: s => s.trim(),
    })
  )
  .then(({title}) => title)
}

function promptDescription () {
  return Promise.try(() =>
    inquirer.prompt({
      name: 'vendor',
      message: 'What\'s your VTEX app description?',
      filter: s => s.trim(),
    })
  )
  .then(({description}) => description)
}

function createManifest (name, vendor, title, description) {
  const [year, ...monthAndDay] = moment().format('YYYY-MM-DD').split('-')
  const manifest = {
    name,
    vendor,
    version: '1.0.0',
    title,
    description,
    mustUpdateAt: `${Number(year) + 1}-${monthAndDay.join('-')}`,
    categories: [],
    settingsSchema: {},
    dependencies: {
      'vtex.renderjs': '0.x',
      'vtex.placeholder': '0.x',
      'npm:react': '15.1.0',
    },
  }
  return JSON.stringify(manifest, null, 2)
}

export default {
  init: {
    description: 'Create basic files and folders for your VTEX app',
    handler: function () {
      log.info('Hello! I will help you generate basic files and folders for your app.')
      log.info('Please login before procceding.\n')
      return this.login.handler()
      .tap(() => {
        log.debug('Creating app folders')
        console.log('')
        log.info('Now that you\'re logged please provide us some info about your app.')
      })
      .then(() =>
        mapSeries([
          promptName,
          promptVendor,
          promptTitle,
          promptDescription,
        ], f => f())
      )
      .spread((name, vendor, title, description) => {
        const fullName = `${vendor}.${name}`
        const appFolder = join(process.cwd(), fullName)
        return bbMkdir(appFolder)
        .tap(() => log.debug('Creating manifest file'))
        .then(() =>
          bbWriteFile(
            join(process.cwd(), fullName, 'manifest.json'),
            createManifest(name, vendor, title, description)
          )
        )
        .then(promptService)
        .then(service => this.init[service].handler(appFolder))
        .tap(() => {
          console.log('')
          log.info(`${fullName} structure generated successfully!`)
          log.info(`Enter on the ${fullName} folder and run ${chalk.bold.green('vtex watch')} to start developing!`)
        })
        .catch(err =>
          err && err.code === 'EEXIST'
            ? log.error(`Folder ${fullName} already exists.`)
            : Promise.reject(err)
        )
      })
    },
    render: {
      description: 'Create a new render bootstrap project',
      requiredArgs: 'path',
      handler: (appPath) => {
        log.debug('Prompting for app info')
        return bbMkdir(join(appPath, 'render'))
      },
    },
  },
}
