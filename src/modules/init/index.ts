import {keys, prop} from 'ramda'
import chalk from 'chalk'
import * as moment from 'moment'
import * as Bluebird from 'bluebird'
import * as inquirer from 'inquirer'
import * as git from './git'
import log from '../../logger'
import {outputJson, readJson} from 'fs-extra'
import {manifestPath} from '../../manifest'

const {mapSeries} = Bluebird

const currentFolderName = process.cwd().replace(/.*\//, '')

const templates = {
  'react getting-started': 'render-getting-started',
  'graphql getting-started': 'product-review-graphql-example',
  'react+graphql': 'catalogue',
  'hello graphql': 'hello-graphql',
  'hello react': 'hello-react',
}

const promptName = async () => {
  const message = 'The app name should only contain numbers, lowercase letters, underscores and hyphens.'
  return prop('name', await inquirer.prompt({
    name: 'name',
    message: 'What\'s your VTEX app name?',
    validate: s => /^[a-z0-9\-_]+$/.test(s) || message,
    filter: s => s.trim(),
    default: currentFolderName,
  }))
}

const promptVendor = async () => {
  const message = 'The vendor should only contain numbers, lowercase letters, underscores and hyphens.'
  return prop('vendor', await inquirer.prompt({
    name: 'vendor',
    message: 'What\'s your VTEX app vendor?',
    validate: s => /^[a-z0-9\-_]+$/.test(s) || message,
    filter: s => s.trim(),
    default: null,
  }))
}

const promptTitle = async () => {
  return prop('title', await inquirer.prompt({
    name: 'title',
    message: 'What\'s your VTEX app title?',
    filter: s => s.trim(),
  }))
}

const promptDescription = async () => {
  return prop('description', await inquirer.prompt({
    name: 'description',
    message: 'What\'s your VTEX app description?',
    filter: s => s.trim(),
  }))
}

const promptTemplates = async () => {
  const cancel = 'Cancel'
  const {service: chosen} = await inquirer.prompt({
    name: 'service',
    message: 'Choose where do you want to start from',
    type: 'list',
    choices: [...keys(templates), cancel],
  })
  if (chosen === cancel) {
    log.info('Bye o/')
    return process.exit()
  }
  return chosen
}

const promptContinue = async () => {
  const {proceed} = await inquirer.prompt({
    name: 'proceed',
    message: `You are about to remove all files in ${process.cwd()}. Do you want to continue ?`,
    type: 'confirm',
  })
  if (!proceed) {
    log.info('Bye o/')
    process.exit()
  }
}

const manifestFromPrompt = async () => {
  return mapSeries([
    promptName,
    promptVendor,
    promptTitle,
    promptDescription,
  ], f => f())
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
    registries: ['smartcheckout'],
  }
}

export default async () => {
  log.debug('Prompting for app info')
  log.info('Hello! I will help you generate basic files and folders for your app.')
  try {
    const repo = templates[await promptTemplates()]
    await promptContinue()
    log.info(`Cloning https://vtex-apps/${repo}.git`)
    const [, [name, vendor, title, description]]: any = await Bluebird.all([
      git.clone(repo),
      manifestFromPrompt(),
    ])
    const synthetic = createManifest(name, vendor, title, description)
    const manifest: any = Object.assign(await readJson(manifestPath) || {}, synthetic)
    await outputJson(manifestPath, manifest, {spaces: 2})
    log.info(`Run ${chalk.bold.green('vtex link')} to start developing!`)
  } catch (err) {
    log.error(err.message)
    err.printStackTrace()
  }
}
