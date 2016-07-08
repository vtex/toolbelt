import ora from 'ora'
import chalk from 'chalk'
import log from '../logger'
import Table from 'cli-table'
import inquirer from 'inquirer'
import readline from 'readline'
import {Promise, all} from 'bluebird'
import {listRoot, logChanges} from '../sandbox'
import userAgent from '../user-agent'
import {getDevWorkspace, getWorkspaceURL} from '../workspace'
import {renderWatch, renderBuild} from '../render'
import {getToken, getAccount, getLogin} from '../conf'
import {
  WorkspaceAppsClient,
  WorkspaceSandboxesClient,
  SandboxesClient,
} from '@vtex/apps'
import {
  manifest,
  vendorPattern,
  namePattern,
  wildVersionPattern,
} from '../manifest'
import {
  generateFilesHash,
  createBatch,
  createChanges,
  createBuildFolder,
  watch,
  removeBuildFolder,
  createTempPath,
  listLocalFiles,
  compressFiles,
  deleteTempFile,
} from '../file'

let spinner

const root = process.cwd()

const {vendor, name, version} = manifest

const workspaceAppsClient = () => new WorkspaceAppsClient({
  authToken: getToken(),
  userAgent: userAgent,
})

const sandboxesClient = () => new SandboxesClient({
  authToken: getToken(),
  userAgent: userAgent,
})

const workspaceSandboxesClient = () => new WorkspaceSandboxesClient({
  authToken: getToken(),
  userAgent: userAgent,
})

const sendChanges = changes => {
  if (spinner) {
    spinner.start()
  } else {
    spinner = ora('Sending changes...').start()
  }
  return sandboxesClient().updateFiles(
    vendor,
    getLogin(),
    name,
    version,
    changes
  )
  .then(() => logChanges(changes))
  .tap(() => spinner.stop())
  .then(log => log.length > 0 ? console.log(log) : null)
}

const updateAppTtl = () => {
  return workspaceSandboxesClient().updateAppTtl(
    getAccount(),
    getDevWorkspace(getLogin()),
    vendor,
    getLogin(),
    name,
    version,
    35
  )
  .catch(() => {})
}

const keepAppAlive = () => {
  return updateAppTtl()
  .then(() => {
    const keepAliveInterval = setInterval(() => updateAppTtl(), 30000)
    readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    }).on('SIGINT', () => {
      workspaceSandboxesClient().deactivateApp(
        getAccount(),
        getDevWorkspace(getLogin()),
        vendor,
        getLogin(),
        name,
        version
      ).finally(() => {
        if (spinner) {
          spinner.stop()
        }
        clearTimeout(keepAliveInterval)
        process.exit()
      })
    })
  })
}

const generateFilesHashWithRoot = localFiles => generateFilesHash(root, localFiles)

export default {
  list: {
    alias: 'ls',
    'optionalArgs': 'query',
    description: 'List your installed VTEX apps',
    handler: () => {
      log.debug('Starting to list apps')
      workspaceAppsClient().listDependencies(
        getAccount(),
        getDevWorkspace(getLogin()),
        'storefront'
      )
      .then(res => {
        if (res.data.length === 0) {
          return log.info('You have no installed apps')
        }
        const table = new Table({
          head: ['Vendor', 'Name', 'Version'],
        })
        res.data.forEach(r => {
          table.push([
            r.vendor,
            r.name,
            r.version,
          ])
        })
        console.log(table.toString())
      })
    },
  },
  watch: {
    description: 'Send the files to the sandbox and watch for changes',
    handler: () => {
      log.info('Watching app', `${vendor}.${name}@${version}`)
      console.log(
        chalk.green('Your URL:'),
        chalk.blue(getWorkspaceURL(getAccount(), getLogin()))
      )
      return all([
        listLocalFiles(root).then(generateFilesHashWithRoot),
        listRoot(manifest, getLogin(), getToken()),
      ])
      .spread(createBatch)
      .then(batch => createChanges(root, batch))
      .then(sendChanges)
      .then(keepAppAlive)
      .then(() => createBuildFolder(root))
      .then(() => watch(root, sendChanges))
      .then(() => renderWatch(root, manifest))
    },
  },
  install: {
    requiredArgs: 'app',
    alias: 'i',
    options: [
      {
        short: 's',
        long: 'simulation',
        description: 'simulate an install',
        type: 'boolean',
      },
    ],
    description: 'Install the specified app',
    handler: (app, options) => {
      log.debug('Starting to install app', app)
      const appRegex = new RegExp(`^${vendorPattern}\.${namePattern}@${wildVersionPattern}$`)
      if (!appRegex.test(app)) {
        return log.error('Invalid app format, please use <vendor>.<name>@<version>')
      }
      const simulation = options.s || options.simulation
      const [name, version] = app.split('@')
      workspaceAppsClient().installApp(
        getAccount(),
        getDevWorkspace(getLogin()),
        name,
        version,
        simulation
      )
      .then(() => log.info(`Installed app ${app} succesfully`))
      .catch(err => {
        if (err.statusCode === 409) {
          return log.error(`App ${app} already installed`)
        }
        throw new Error(err)
      })
    },
  },
  uninstall: {
    requiredArgs: 'app',
    options: [
      {
        short: 's',
        long: 'simulation',
        description: 'simulate an uninstall',
        type: 'boolean',
      },
    ],
    description: 'Uninstall the specified app',
    handler: (app, options) => {
      log.debug('Starting to uninstall app', app)
      const appRegex = new RegExp(`^${vendorPattern}\.${namePattern}$`)
      if (!appRegex.test(app)) {
        return log.error('Invalid app format, please use <vendor>.<name>')
      }
      const simulation = options.s || options.simulation
      Promise.try(() =>
        inquirer.prompt({
          type: 'confirm',
          name: 'confirm',
          message: `Are you sure you want to uninstall the app ${app}?`,
        })
      )
      .then(({confirm}) => confirm || Promise.reject('User cancelled'))
      .then(() =>
        workspaceAppsClient().uninstallApp(
          getAccount(),
          getDevWorkspace(getLogin()),
          app,
          simulation
        )
      )
      .then(() => log.info(`Uninstalled app ${app} succesfully`))
      .catch(err => {
        if (err.statusCode === 409) {
          return log.error(`App ${app} not installed`)
        }
        throw new Error(err)
      })
    },
  },
  publish: {
    description: 'Publish this app',
    handler: () => {
      log.debug('Starting to publish app')
      spinner = ora('Publishing app...').start()
      removeBuildFolder(root)
      .then(() => all([
        createTempPath(name, version),
        renderBuild(root, manifest),
      ]))
      .spread(tempPath =>
        listLocalFiles(root)
        .then(files => compressFiles(files, tempPath))
        .then(({file}) => workspaceAppsClient().publishApp(vendor, file))
        .then(() => deleteTempFile(tempPath))
        .then(() => spinner.stop())
        .then(() => log.info(`Published app ${vendor}.${name} succesfully`))
      )
    },
  },
}
