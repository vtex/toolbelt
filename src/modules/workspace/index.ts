import * as chalk from 'chalk'
import * as inquirer from 'inquirer'
import * as Bluebird from 'bluebird'

import {
  getAccount,
  getToken,
  saveWorkspace,
} from '../../conf'
import {workspaces} from '../../clients'
import {dirnameJoin} from '../../file'
import log from '../../logger'

const promptWorkspaceInput = (account: string, token: string): Bluebird<string> =>
  inquirer.prompt({
    name: 'workspace',
    filter: s => s.trim(),
    message: 'New workspace name:',
    validate: s => /^(\s*|\s*[\w-]+\s*)$/.test(s) || 'Please enter a valid workspace.',
  })
  .then(({workspace}: {workspace: string}) => workspace)
  .tap(workspace => workspaces.create(account, workspace))
  .catch(err => {
    if (err.response && err.response.data.code === 'WorkspaceAlreadyExists') {
      log.error(err.response.data.message)
      return promptWorkspaceInput(account, token)
    }
    throw new Error(err)
  })

export default {
  workspace: {
    description: 'Switch workspaces',
    handler: async () => {
      const newWorkspace = 'Create new workspace...'
      const master = `master ${chalk.red('(read-only)')}`
      return workspaces.list(getAccount())
        .then(workspaces =>
          inquirer.prompt({
            type: 'list',
            name: 'workspace',
            message: 'Workspaces:',
            choices: [
              newWorkspace,
              master,
              ...workspaces.map(w => w.name).filter(w => w !== 'master'),
              new inquirer.Separator(),
            ],
          }),
        )
        .then(({workspace}: {workspace: string}) => {
          switch (workspace) {
            case master:
              return 'master'
            case newWorkspace:
              return promptWorkspaceInput(getAccount(), getToken())
            default:
              return workspace
          }
        })
        .then(saveWorkspace)
    },
    list: {
      alias: 'ls',
      module: dirnameJoin('modules/workspace/list'),
    },
    create: {
      module: dirnameJoin('modules/workspace/create'),
    },
    delete: {
      module: dirnameJoin('modules/workspace/delete'),
    },
    promote: {
      module: dirnameJoin('modules/workspace/promote'),
    },
    use: {
      module: dirnameJoin('modules/workspace/use'),
    },
    reset: {
      module: dirnameJoin('modules/workspace/reset'),
    },
    prepare: {
      module: dirnameJoin('modules/workspace/prepare'),
    },
  },
}
