import { Apps, Workspaces } from '@vtex/api'
import bluebird from 'bluebird'
import c from 'chalk'
import { TaskQueue } from 'cwait'
import { readFileSync, readJSONSync, writeJSON } from 'fs-extra'
import { prompt } from 'inquirer'
import minimist from 'minimist'
import { join } from 'path'

global.Promise = bluebird

const ACCOUNTS_FILE = join(process.env.HOME, 'accounts.json')
const TOKEN_FILE = join(process.env.HOME, 'token.json')
const COMMANDS = ['uninstall']
const WORKSPACE_NAME_PREFIX = 'mass-apps-operation'
const USER_AGENT = 'vtex.toolbelt/mass-apps-operation'
const REGION = 'aws-us-east-1'

const usage = (error) => `⚠️  Oops! There seems to be a problem.

${c.red(error)}

Usage instructions:

- Create the following files in your HOME directory:
  ~/accounts.json - [{"name": "basedevmkp"}]
  ~/token.json - {"VtexIdclientAutCookie": "A token from vtexcommercestable"}

- Use one of the available commands followed by an app locator:
  {${COMMANDS.join(', ')}} {app}

Example:
> yarn apps uninstall vtex.render-builder
`

const dragons = c.green(readFileSync('./dragons.txt').toString())
const argv = minimist(process.argv.slice(2))
const [command, app] = argv._
const queue = new TaskQueue(Promise, 10)
const skippedAccounts = []
const errorLogs = {}
let accounts
let authToken

const confirm = (accountsNumber: number, commandName: string, appName: string): Promise<boolean> =>
  prompt({
    name: 'c',
    type: 'confirm',
    default: false,
    message: `Are you sure you want to ${c.red(commandName)} the app ${c.green(appName)} in ${c.red(accountsNumber + '')} accounts?`,
  }).then(({c}) => c)

const isSmartCheckout = ({name}) => {
  return name === 'smartcheckout'
}

// Basic validation
try {
  accounts = readJSONSync(ACCOUNTS_FILE)
  const {VtexIdclientAutCookie} = readJSONSync(TOKEN_FILE)
  authToken = VtexIdclientAutCookie

  if (!COMMANDS.includes(command) || !app) {
    throw new Error(`Invalid command or arguments: ${argv._}`)
  }

  if (accounts.find(isSmartCheckout)) {
    console.log(c.red.bold('U MAD? (Account list includes "smartcheckout". You wanna go home and rethink your life.)'))
    process.exit(1)
  }
} catch (e) {
  console.log(usage(e))
  process.exit(1)
}

// Let's do this
const main = async () => {
  try {
    console.log('\n' + dragons)
    if (!await confirm(accounts.length, command, app)) {
      console.log('What do we say to the God of Death? Not today.')
      process.exit(2)
    }
    console.log(c.blue('I sure hope you know what you\'re doing.'))

    const workspace = `${WORKSPACE_NAME_PREFIX}-${command}`
    const workspaces = new Workspaces({
      account: 'vtex',
      workspace: 'master',
      authToken,
      userAgent: USER_AGENT,
      region: REGION,
    })

    await Promise.map(accounts, queue.wrap(uninstall(workspace, workspaces)))

    if (skippedAccounts.length === 0) {
      console.log('✅  All done!')
    } else {
      writeJSON('./errors.json', errorLogs, {spaces: 2})
      writeJSON('./skipped-accounts.json', skippedAccounts.map(a => ({name: a})), {spaces: 2})
      console.log()
      console.log('🚫  The following accounts were skipped:')
      console.log(skippedAccounts + '\n')
      console.log('⚠️  All logs were saved to ./errors.json')
      console.log('⚠️  All skipped accounts were saved to ./skipped-accounts.json')
    }
  } catch (e) {
    console.log(c.red.bold('💥  Oh noes! An unexpected error occurred. Here\'s all I know about it:'))
    console.error(e.response ? e.response : e)
    process.exit(3)
  }
}

const uninstall = (workspace: string, workspaces: Workspaces) => async ({name: account}: {name: string}) => {
  const apps = new Apps({
    account,
    workspace,
    authToken,
    userAgent: USER_AGENT,
    region: REGION,
  })
  const prefix = c.bold(`[${account}/${workspace}]`)
  const log = (s) => console.log(`${prefix} ${s}`)

  log('Creating workspace...')
  try {
    await workspaces.create(account, workspace)
  } catch (e) {
    const code = e.response.data.code
    if (code === 'WorkspaceAlreadyExists') {
      try {
        log('Workspace already exists. Deleting it.')
        await workspaces.delete(account, workspace)
      } catch (e) {
        console.log(e)
        log(c.red(`Failed to delete workspace. Skipping account.`))
        skippedAccounts.push(account)
        errorLogs[account] = e.response
        return
      }
    }
  }
  log('Workspace created successfully.')

  try {
    log(`Uninstalling app ${c.green(app)}.`)
    await apps.uninstallApp(app)
    log(`Uninstalled app ${c.green(app)} successfully.`)
  } catch (e) {
    log(c.red(`Failed to uninstall ${app}. Deleting workspace and skipping account.`))
    await workspaces.delete(account, workspace)
    log('Workspace deleted successfully.')
    skippedAccounts.push(account)
    errorLogs[account] = e.response
    return
  }

  log('Setting production mode.')
  await workspaces.set(account, workspace, {production: true})
  log('Production mode set successfully.')
  log('Promoting workspace...')
  await workspaces.promote(account, workspace)
  log('Workspace promoted successfully.')
}

main()
