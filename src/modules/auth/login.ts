import {prop} from 'ramda'
import * as chalk from 'chalk'
import * as inquirer from 'inquirer'
import * as Bluebird from 'bluebird'
import * as opn from 'opn'
import * as  jwt from 'jsonwebtoken';
import * as EventSource from 'eventsource'
import * as randomstring from 'randomstring'
import log from '../../logger'
import {
  getLogin,
  saveToken,
  saveLogin,
  getAccount,
  saveAccount,
  getWorkspace,
  saveWorkspace,
} from '../../conf'

const {mapSeries, all} = Bluebird
const [cachedAccount, cachedLogin, cachedWorkspace] = [getAccount(), getLogin(), getWorkspace()]

const workspacesClient = () => {
  const clients = '../../clients.js'
  try {
    delete require.cache[require.resolve(clients)]
  } catch (e) {}
  return require(clients)['workspaces']
}

const startUserAuth = (account: string, workspace: string): Bluebird<string | never> => {
  const state = randomstring.generate()
  const returnUrlEncoded = encodeURIComponent(`/_toolbelt/callback?state=${state}&workspace=${workspace}`)
  const url = `https://${account}.myvtex.com/admin/login/?workspace=${workspace}&ReturnUrl=${returnUrlEncoded}`
  opn(url, {wait: false})

  return new Promise((resolve, reject) => {
    const es = new EventSource(`https://${account}.myvtex.com/_toolbelt/sse/${state}?workspace=${workspace}`)
    es.addEventListener('message', (msg: MessageJSON) => {
      const {
        body: token,
      }: Message = JSON.parse(msg.data)
      es.close()
      resolve(token)
    })

    es.onerror = (err) => {
      log.error(`Connection to login server has failed with status ${err.status}`)
      reject(err)
    }
  })
}

const promptWorkspaceInput = (account: string, token: string): Bluebird<string> =>
  Promise.resolve(
    inquirer.prompt({
      name: 'workspace',
      filter: s => s.trim(),
      message: 'New workspace name:',
      validate: s => /^(\s*|\s*[\w-]+\s*)$/.test(s) || 'Please enter a valid workspace.',
    })
    .then(({workspace}: {workspace: string}) => workspace),
  )
  .tap(workspace => workspacesClient().create(account, workspace))
  .catch(err => {
    if (err.response && err.response.data.code === 'WorkspaceAlreadyExists') {
      log.error(err.response.data.message)
      return promptWorkspaceInput(account, token)
    }
    throw new Error(err)
  })

const promptWorkspace = (account: string, token: string): Bluebird<string> => {
  const newWorkspace = 'Create new workspace...'
  const master = `master ${chalk.red('(read-only)')}`
  return workspacesClient().list(account)
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
          return promptWorkspaceInput(account, token)
        default:
          return workspace
      }
    })
}

const promptUsePrevious = (): Bluebird<boolean> => {
  log.info(
    'Found previous credential!',
    `\n${chalk.bold('Email:')} ${chalk.green(cachedLogin)}`,
    `\n${chalk.bold('Account:')} ${chalk.green(cachedAccount)}`,
    `\n${chalk.bold('Workspace:')} ${chalk.green(cachedWorkspace)}`,
  )
  return Promise.resolve(
    inquirer.prompt({
      type: 'confirm',
      name: 'confirm',
      message: 'Do you want to log in with the previous credential?',
    }),
  )
  .then<boolean>(prop('confirm'))
}

const promptAccount = (): Bluebird<string> =>
  Promise.resolve(
    inquirer.prompt({
      name: 'account',
      message: 'Account:',
      filter: (s) => s.trim(),
      validate: (s) => /^\s*[\w-]+\s*$/.test(s) || 'Please enter a valid account.',
    }),
  )
  .then<string>(prop('account'))

const saveCredentials = (login: string, account: string, token: string, workspace: string): void => {
  saveLogin(login)
  saveAccount(account)
  saveToken(token)
  saveWorkspace(workspace)
}

export default {
  description: 'Log into a VTEX account',
  options: [
    {
      short: 'w',
      long: 'workspace',
      description: 'Login in a specific workspace',
      type: 'bool',
    },
  ],
  handler: (options) => {
    return Promise.resolve(cachedLogin)
      .then((login) => login ? promptUsePrevious() : false)
      .then(prev =>
        prev
          ? [cachedAccount, cachedWorkspace]
          : mapSeries([promptAccount, () => cachedWorkspace], fn => fn()),
      )
      .spread((account: string, workspace: string) => {
        log.debug('Start login', {account, workspace})
        return all([
          account,
          startUserAuth(account, options.w || options.workspace || 'master'),
          workspace,
        ])
      })
      .spread((account: string, token: string, workspace: string) => {
        const decodedToken = jwt.decode(token)
        const login = decodedToken.sub
        saveCredentials(login, account, token, workspace)
        const actualWorkspace = workspace || promptWorkspace(account, token)
        return all([login, account, token, actualWorkspace])
      })
      .spread((login: string, account: string, token: string, workspace: string) => {
        saveWorkspace(workspace)
        log.debug('Login successful', login, account, token, workspace)
        log.info(`Logged into ${chalk.blue(account)} as ${chalk.green(login)} at workspace ${chalk.green(workspace)}`)
      })
  },
}
