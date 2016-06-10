import log from '../logger'
import Table from 'cli-table'
import inquirer from 'inquirer'
import readline from 'readline'
import {Promise} from 'bluebird'
import pkg from '../../package.json'
import {logChanges} from '../sandbox-utils'
import {getDevWorkspace} from '../workspace-utils'
import {getToken, getAccount, getLogin} from '../conf'
import {
  WorkspaceAppsClient,
  WorkspaceSandboxesClient,
  SandboxesClient,
} from '@vtex/apps'
import {
  vendorPattern,
  namePattern,
  wildVersionPattern,
  getAppManifest,
} from '../manifest-utils'
import {
  generateFilesHash,
  createBatch,
  createChanges,
  watch,
  createTempPath,
  getVtexIgnore,
  listFiles,
  compressFiles,
  deleteTempFile,
} from '../file-utils'

const workspaceAppsClient = () => new WorkspaceAppsClient({
  authToken: getToken(),
  userAgent: `toolbelt-v-${pkg.version}`,
})

const sandboxesClient = () => new SandboxesClient({
  authToken: getToken(),
  userAgent: `toolbelt-v-${pkg.version}`,
})

const workspaceSandboxesClient = () => new WorkspaceSandboxesClient({
  authToken: getToken(),
  userAgent: `toolbelt-v-${pkg.version}`,
})

export default {
  list: {
    alias: 'ls',
    'optionalArgs': 'query',
    description: 'List your installed VTEX apps',
    handler: () => {
      log.debug('Starting to list apps')
      log.info('You have no installed apps')
    },
  },
  link: {
    requiredArgs: 'path',
    description: 'Link this path creating a sandbox',
    handler: (path) => {
      log.debug('Starting to link path', path)
      log.info('Link', path)
    },
  },
  install: {
    requiredArgs: 'app',
    alias: 'i',
    description: 'Install the specified app',
    handler: (app) => {
      log.debug('Starting to install app', app)
      log.info('Install app', app)
    },
  },
  uninstall: {
    requiredArgs: 'app',
    description: 'Uninstall the specified app',
    handler: (app) => {
      log.debug('Starting to uninstall app', app)
      log.info('Uninstall app', app)
    },
  },
  publish: {
    requiredArgs: 'app',
    description: 'Publish this app',
    handler: (app) => {
      log.debug('Starting to publish app', app)
      log.info('Publish app', app)
    },
  },
}
