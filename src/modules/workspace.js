import chalk from 'chalk'
import moment from 'moment'
import log from '../logger'
import Table from 'cli-table'
import inquirer from 'inquirer'
import {Promise} from 'bluebird'
import userAgent from '../user-agent'
import {VBaseClient} from '@vtex/vbase'
import {getToken, getAccount, saveWorkspace} from '../conf'

const client = () => new VBaseClient({
  endpointUrl: 'BETA',
  authToken: getToken(),
  userAgent: userAgent,
})

export default {
  workspace: {
    list: {
      description: 'List workspaces on this account',
      handler: () => {
        log.debug('Listing workspaces')
        return client().list(getAccount()).then(res => {
          const table = new Table({
            head: ['Name', 'Last Modified', 'State'],
          })
          res.forEach(r => {
            table.push([
              r.name,
              moment(r.lastModified).calendar(),
              r.state,
            ])
          })
          console.log(table.toString())
        })
      },
    },
    create: {
      requiredArgs: 'name',
      description: 'Create a new workspace with this name',
      handler: (name) => {
        log.debug('Creating workspace', name)
        return client().create(getAccount(), name)
        .then(() => log.info(`Workspace ${name} created successfully`))
        .catch(res => {
          return res.statusCode === 409
          ? log.info(`Workspace ${name} already exists`)
          : Promise.reject(res)
        })
      },
    },
    delete: {
      requiredArgs: 'name',
      description: 'Delete this workspace',
      handler: (name) => {
        log.debug('Deleting workspace', name)
        return inquirer.prompt({
          type: 'confirm',
          name: 'confirm',
          message: `Are you sure you want to delete workspace ${name}?`,
        })
        .then(({confirm}) => confirm || Promise.reject('User cancelled'))
        .then(() => client().delete(getAccount(), name))
        .then(() => log.info(`Workspace ${name} deleted successfully`))
      },
    },
    use: {
      requiredArgs: 'name',
      description: 'Use a workspace to perform operations',
      handler: (name) => {
        return client().get(getAccount(), name)
        .then(() => saveWorkspace(name))
        .then(() => log.info(`You're now using the workspace ${name}!`))
        .catch(res => {
          if (res.error && res.error.Code === 'NotFound') {
            log.info(`Workspace ${name} doesn't exist`)
            log.info(`You can use ${chalk.bold(`vtex workspace create ${name}`)} to create it!`)
            return
          }
          return Promise.reject(res)
        })
      },
    },
    promote: {
      requiredArgs: 'name',
      description: 'Promote this workspace to master',
      handler: (name) => {
        log.debug('Promoting workspace', name)
        return inquirer.prompt({
          type: 'confirm',
          name: 'confirm',
          message: `Are you sure you want to promote workspace ${name} to master?`,
        })
        .then(({confirm}) => confirm || Promise.reject('User cancelled'))
        .then(() => client().promote(getAccount(), name))
        .then(() => log.info(`Workspace ${name} promoted successfully`))
      },
    },
  },
}
